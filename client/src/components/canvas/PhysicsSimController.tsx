/**
 * Живёт внутри <Canvas>, запускает/останавливает GPU-симуляцию
 * (Style3DSolverScene) при переключении useEditorStore.simMode и на каждом
 * кадре useFrame() пишет результат солвера напрямую в геометрию
 * physicsMesh-объектов (vertex-морфер, см. wiki/plans/
 * 3d_configurator_integration.md, Этап 7). Не рендерит ничего сам.
 *
 * ВАЖНО: работает мимо useSceneStore — позиции обновляются напрямую в
 * THREE.BufferGeometry через physicsGeometryRegistry, чтобы не бомбить
 * zundo-историю и React re-render каждый физический кадр.
 *
 * 'simulate' vs 'paused' vs 'edit' (см. SimMode в useEditorStore.ts):
 * ТОЛЬКО переход в/из 'edit' создаёт/уничтожает GPU-ресурсы (activeRef.current).
 * 'paused' держит тот же ActiveSim живым — useFrame() просто перестаёт
 * вызывать runFrame(), геометрия остаётся в текущей (деформированной) позе.
 * Возврат в 'simulate' из 'paused' — resume того же солвера, без пересборки.
 *
 * SceneView.tsx рендерит ВСЕ объекты (включая выбранный) через обычный путь
 * SceneObject, а не через TransformGizmo, всегда кроме simMode === 'edit' —
 * это специально, чтобы выбор/снятие выделения объекта во время симуляции
 * ИЛИ паузы НЕ пересоздавало его геометрию (иначе накопленная vertex-морф
 * деформация сбросилась бы к rest-позе). Пересоздание геометрии происходит
 * только в момент перехода в/из 'edit', когда сброс к rest-позе и так
 * корректен (start) или намеренный (stop, см. resetGeometries ниже).
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { mat4 as glMat4 } from 'gl-matrix';

import { useEditorStore } from '@/store/useEditorStore';
import { useSceneStore } from '@/store/useSceneStore';
import { usePhysicsDebugStore } from '@/store/usePhysicsDebugStore';
import { toast } from '@/store/useToastStore';
import { getPhysicsGeometry } from '@/physics/physicsGeometryRegistry';
import { buildSceneSimInputFromEditor } from '@/physics/buildSceneSimInputFromEditor';

import { GpuContext } from '@wgpu/api/gpu_context';
import { buildSolverSceneData } from '@wgpu/physics/solver/scene_to_solver';
import { Style3DSolverScene } from '@wgpu/physics/solver/style3d_scene';
import { buildSeamTopologyFromSceneData } from '@wgpu/physics/seam/build_seam_topology';
import { ExtractPhysicsPositionsKernel } from '@wgpu/render/update_render_bufs';
import type { SceneObjectData } from '@shared/types/scene';

// Значения по умолчанию из tests/seaming_scene_test_entry.ts (реальная сцена
// scene1copy1) — см. wiki/plans/seaming.md, §«Жёсткость/притяжение прошло
// ЧЕТЫРЕ версии»: force-based пружина L0=0 безопасна ТОЛЬКО в связке с
// упрощённым seam-time солвером (stepWithSeaming/SolveDiagonalKernel), не с
// обычным step()/PCG.
const SEAM_STIFFNESS = 1e4;
const SEAM_MERGE_DISTANCE = 0.03; // м

interface ClothExtractor {
  objectId: string;
  kernel: ExtractPhysicsPositionsKernel;
}

interface ActiveSim {
  ctx: GpuContext;
  scene: Awaited<ReturnType<typeof Style3DSolverScene.create>>;
  extractors: ClothExtractor[];
  /**
   * Промис текущего кадра, пока он не долетел до GPU и обратно (несколько
   * await внутри runFrame). null — кадр не выполняется, можно стартовать
   * следующий. Используется useFrame() (не запускать второй кадр поверх
   * первого) И stop-эффектом ниже (дождаться его перед destroySimulation —
   * иначе runFrame читает/пишет уже уничтоженные GPU-буферы, см. коммент
   * у stop-ветки эффекта).
   */
  framePromise: Promise<void> | null;
  /**
   * Есть швы для сшивания (seam_collection.json дал хотя бы один стежок) —
   * runFrame() гоняет scene.stepWithSeaming() вместо обычного scene.step().
   * stepWithSeaming — внутренний конечный автомат Style3DSolverScene: пока
   * !solver.seamingDone — упрощённый seam-time солвер (SeamAttractKernel +
   * SolveDiagonalKernel, БЕЗ PCG); после — 100 шагов плавного повышения
   * жёсткости (stepStiffAdjust), потом обычный FEM+PCG step() с нарастающим
   * демпфированием. См. Style3DSolverScene.stepWithSeaming() и wiki/plans/
   * seaming.md.
   */
  hasSeams: boolean;
}

const SIM_DT = 1 / 60;

async function startSimulation(objects: SceneObjectData[]): Promise<ActiveSim> {
  if (!navigator.gpu) {
    throw new Error('WebGPU недоступен в этом браузере (navigator.gpu отсутствует)');
  }

  const input = buildSceneSimInputFromEditor(objects);
  if (input.clothCount === 0) {
    throw new Error('В сцене нет cloth-объектов (physicsMesh с physicsType = Cloth)');
  }

  // Швы — загружены при импорте сцены в usePhysicsDebugStore (тот же
  // seam_collection.json, что и debug-оверлей, Этап 4b). Стежки — cloth-local
  // индексы, тот же порядок конкатенации cloth-объектов, что и
  // buildSceneSimInputFromEditor()/buildSolverSceneData() (см. resolveClothLocal
  // в PhysicsDebugOverlay.tsx и её комментарий про порядок objects_index.json —
  // здесь тот же инвариант: живой стор с момента импорта не переупорядочивался).
  const seamCollection = usePhysicsDebugStore.getState().seamCollection;
  const stitches = seamCollection?.seams.flatMap((s) => s.stitches) ?? [];

  // Стежки передаются buildSolverSceneData ДО построения топологии — она
  // использует их (параметр seamStitches), чтобы отсеять bend-ограничения,
  // вырождающиеся после сшивания (см. build_bend_constraints.ts,
  // vertexMergeMap; и tests/seaming_scene_test_entry.ts::loadSceneAndSolver).
  const data = buildSolverSceneData(input, stitches);

  const seamTopology =
    stitches.length > 0 && seamCollection ? buildSeamTopologyFromSceneData(data, seamCollection) : undefined;

  const ctx = new GpuContext();
  await ctx.init('high-performance');

  const scene = await Style3DSolverScene.create(
    ctx,
    data,
    {
      numNewtonIters: 1,
      numPcgIters: 10,
      numSubsteps: 10,
      ...(seamTopology && {
        seamStiffness: SEAM_STIFFNESS,
        seamMergeDistance: SEAM_MERGE_DISTANCE,
        // Обязателен для seam-сцен: без него runtime-пересборка PD-матрицы
        // после слияния стежков не выполняется, см. wiki/plans/seaming.md,
        // «Открытые вопросы», п.3.
        gpuPdMatrixRebuild: true,
      }),
    },
    seamTopology,
  );

  const clothPhysObjects = input.objects.slice(input.staticCount);
  const extractors: ClothExtractor[] = clothPhysObjects.map((physObj) => {
    const sceneObj = objects.find((o) => o.physicsMesh?.uuid === physObj.uuid);
    if (!sceneObj) throw new Error(`internal: нет SceneObjectData для uuid ${physObj.uuid}`);

    const inv = glMat4.invert(glMat4.create(), physObj.getMat4());
    if (!inv) throw new Error(`Вырожденный transform у объекта "${sceneObj.name}" — не удалось инвертировать`);

    const kernel = new ExtractPhysicsPositionsKernel(
      ctx,
      scene.solver.vertices,
      physObj.vertexCount,
      physObj.vertexOffset,
      Float32Array.from(inv),
    );
    return { objectId: sceneObj.id, kernel };
  });

  return { ctx, scene, extractors, framePromise: null, hasSeams: !!seamTopology };
}

async function runFrame(sim: ActiveSim): Promise<void> {
  if (sim.hasSeams) {
    // Конечный автомат: seam-time (упрощённый солвер) → stiffness ramp-up →
    // обычный FEM+PCG. Переключение внутри Style3DSolverScene, см. её
    // stepWithSeaming() и комментарий у ActiveSim.hasSeams выше.
    await sim.scene.stepWithSeaming(SIM_DT);
  } else {
    await sim.scene.step(SIM_DT);
  }

  for (const { objectId, kernel } of sim.extractors) {
    const encoder = kernel.runPass();
    sim.ctx.device.queue.submit([encoder.finish()]);
    await sim.ctx.device.queue.onSubmittedWorkDone();
    const raw = await kernel.dstBuf.readData(sim.ctx);

    const geom = getPhysicsGeometry(objectId);
    if (!geom) continue;
    const attr = geom.attributes.position as THREE.BufferAttribute;
    (attr.array as Float32Array).set(new Float32Array(raw));
    attr.needsUpdate = true;
    // computeVertexNormals() каждый кадр — заметная CPU-нагрузка на плотных
    // мешах; для MVP пропускаем (нормали остаются из rest-позы). См. Этап 7.
  }
}

function destroySimulation(sim: ActiveSim): void {
  sim.scene.destroy();
  for (const { kernel } of sim.extractors) {
    kernel.dstBuf.destroy();
    kernel.paramsBuf.destroy();
  }
  sim.ctx.device.destroy();
}

/** Возвращает геометрию объекта к исходной rest-позе (Stop). */
function resetGeometries(objects: SceneObjectData[]): void {
  for (const obj of objects) {
    if (obj.type !== 'physicsMesh' || !obj.physicsMesh) continue;
    const geom = getPhysicsGeometry(obj.id);
    if (!geom) continue;
    const attr = geom.attributes.position as THREE.BufferAttribute;
    (attr.array as Float32Array).set(obj.physicsMesh.positions);
    attr.needsUpdate = true;
    geom.computeVertexNormals();
  }
}

export function PhysicsSimController() {
  const simMode = useEditorStore((s) => s.simMode);
  const stopSimulation = useEditorStore((s) => s.stopSimulation);
  const activeRef = useRef<ActiveSim | null>(null);
  const startingRef = useRef(false);

  useEffect(() => {
    if (simMode === 'simulate' && !activeRef.current && !startingRef.current) {
      startingRef.current = true;
      const objectsSnapshot = useSceneStore.getState().objects;
      startSimulation(objectsSnapshot)
        .then((sim) => {
          activeRef.current = sim;
        })
        .catch((e) => {
          console.error('[PhysicsSimController] не удалось запустить симуляцию:', e);
          toast.error(`Не удалось запустить симуляцию: ${e instanceof Error ? e.message : String(e)}`);
          stopSimulation();
        })
        .finally(() => {
          startingRef.current = false;
        });
    }

    if (simMode === 'edit' && activeRef.current) {
      const sim = activeRef.current;
      // Синхронно, СРАЗУ: useFrame читает activeRef.current каждый вызов —
      // обнулив его здесь, гарантируем, что новый кадр на этом sim больше не
      // стартует. Но текущий кадр (если есть) уже мог уйти в GPU и ждать
      // readback — destroySimulation() ниже уничтожает буферы/устройство, и
      // если runFrame() в этот момент ещё выполняется (await'ы на
      // queue.submit/onSubmittedWorkDone/readData), он обратится к уже
      // destroyed ресурсам. Поэтому ждём sim.framePromise ПЕРЕД destroy —
      // без этого при остановке симуляции во время активного кадра были
      // WebGPU-ошибки чтения из уничтоженных буферов (и риск, что поздний
      // readback перезапишет только что сброшенную rest-позу мусором).
      activeRef.current = null;
      void (sim.framePromise ?? Promise.resolve())
        .catch(() => {}) // ошибка кадра уже обработана его собственным .catch() ниже
        .then(() => {
          destroySimulation(sim);
          resetGeometries(useSceneStore.getState().objects);
        });
    }
  }, [simMode, stopSimulation]);

  // Остановить и освободить GPU-ресурсы при размонтировании Canvas.
  // Кадр здесь НЕ ждём (компонент уже размонтирован, useFrame больше не
  // вызовется) — просто уничтожаем ресурсы; если кадр всё ещё в полёте, он
  // упадёт на destroyed-буферах, но это уже неважно (canvas исчез).
  useEffect(() => {
    return () => {
      if (activeRef.current) {
        destroySimulation(activeRef.current);
        activeRef.current = null;
      }
    };
  }, []);

  useFrame(() => {
    const sim = activeRef.current;
    if (!sim || sim.framePromise) return;
    // 'paused' держит GPU-ресурсы живыми (activeRef.current не обнуляется),
    // но НЕ шагает солвер — это и есть пауза, в отличие от 'edit' (полный
    // teardown, см. эффект выше). Читаем стор напрямую (не через хук) —
    // useFrame зовётся на каждый кадр рендера, не нужно им re-render'ить
    // компонент из-за смены simMode, достаточно свежего значения на чтение.
    if (useEditorStore.getState().simMode !== 'simulate') return;
    sim.framePromise = runFrame(sim)
      .catch((e) => {
        console.error('[PhysicsSimController] кадр симуляции упал:', e);
        toast.error(`Симуляция остановлена: ${e instanceof Error ? e.message : String(e)}`);
        stopSimulation();
      })
      .finally(() => {
        sim.framePromise = null;
      });
  });

  return null;
}
