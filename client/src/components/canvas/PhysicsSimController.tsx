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
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { mat4 as glMat4 } from 'gl-matrix';

import { useEditorStore } from '@/store/useEditorStore';
import { useSceneStore } from '@/store/useSceneStore';
import { usePhysicsDebugStore } from '@/store/usePhysicsDebugStore';
import { usePhysicsEngineSettingsStore } from '@/store/usePhysicsEngineSettingsStore';
import { toast } from '@/store/useToastStore';
import { getPhysicsGeometry } from '@/physics/physicsGeometryRegistry';
import { buildSceneSimInputFromEditor } from '@/physics/buildSceneSimInputFromEditor';

import { GpuContext } from '@wgpu/api/gpu_context';
import { buildSolverSceneData } from '@wgpu/physics/solver/scene_to_solver';
import { Style3DSolverScene } from '@wgpu/physics/solver/style3d_scene';
import { buildSeamTopologyFromSceneData } from '@wgpu/physics/seam/build_seam_topology';
import { ExtractPhysicsPositionsKernel } from '@wgpu/render/update_render_bufs';
import { DragTool, type DragToolRendererLike } from '@wgpu/physics/pick/drag_tool';
import type { SceneObjectData } from '@shared/types/scene';

/** Хоткей переключения drag-инструмента (перетаскивание ткани мышью во время симуляции). */
const DRAG_TOOL_KEY = 'Space';

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
  /** Снимок PhysicsEngineSettings.dt на момент старта (см. startSimulation). */
  dt: number;
  /**
   * Один общий staging-буфер (COPY_DST | MAP_READ) под результаты ВСЕХ
   * extractors — вместо readData() на каждый кернел по отдельности (было
   * 2×N точек CPU↔GPU синхронизации за кадр: submit+onSubmittedWorkDone на
   * дисптач и ещё submit+mapAsync внутри readData() на каждый cloth-объект).
   * Раскладка — конкатенация per-объектных vertexCount*3*4 байт в порядке
   * sim.extractors (см. startSimulation). См. wiki/plans/
   * physics_sim_fps_optimization.md, Этапы 0/A1.
   */
  readbackBuf: GPUBuffer;
}

async function startSimulation(objects: SceneObjectData[]): Promise<ActiveSim> {
  if (!navigator.gpu) {
    throw new Error('WebGPU недоступен в этом браузере (navigator.gpu отсутствует)');
  }

  // Снимок настроек на момент старта — правки в PhysicsEngineSettingsDialog
  // во время активной симуляции не долетают до уже созданного солвера, см.
  // usePhysicsEngineSettingsStore.ts.
  const engineSettings = usePhysicsEngineSettingsStore.getState().settings;

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
      numNewtonIters: engineSettings.numNewtonIters,
      numPcgIters: engineSettings.numPcgIters,
      numSubsteps: engineSettings.numSubsteps,
      adjustFactor: engineSettings.adjustFactor,
      contactFixedStiffness: engineSettings.contactFixedStiffness,
      contactFixedStiffnessEe: engineSettings.contactFixedStiffnessEe,
      contactDamping: engineSettings.contactDamping,
      contactDampingEe: engineSettings.contactDampingEe,
      contactStiffFactor: engineSettings.contactStiffFactor,
      contactStiffFactorEe: engineSettings.contactStiffFactorEe,
      contactHessReg: engineSettings.contactHessReg,
      contactHessRegEe: engineSettings.contactHessRegEe,
      stretchDamping: engineSettings.stretchDamping,
      bendDamping: engineSettings.bendDamping,
      // 1 слот перетаскивания — см. DragTool в PhysicsSimController() ниже
      // (активируется удержанием DRAG_TOOL_KEY). 0 = кернел drag отключён.
      maxDragPoints: 1,
      ...(seamTopology && {
        seamStiffness: engineSettings.seamStiffness,
        seamMergeDistance: engineSettings.seamMergeDistance,
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

  // Один общий readback-буфер под все extractors разом — см. ActiveSim.readbackBuf.
  const totalReadbackBytes = extractors.reduce((sum, { kernel }) => sum + kernel.vertexCount * 3 * 4, 0);
  const readbackBuf = ctx.device.createBuffer({
    label: 'extract_readback_combined',
    size: totalReadbackBytes,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  return { ctx, scene, extractors, framePromise: null, hasSeams: !!seamTopology, dt: engineSettings.dt, readbackBuf };
}

async function runFrame(sim: ActiveSim): Promise<void> {
  if (sim.hasSeams) {
    // Конечный автомат: seam-time (упрощённый солвер) → stiffness ramp-up →
    // обычный FEM+PCG. Переключение внутри Style3DSolverScene, см. её
    // stepWithSeaming() и комментарий у ActiveSim.hasSeams выше.
    await sim.scene.stepWithSeaming(sim.dt);
  } else {
    await sim.scene.step(sim.dt);
  }

  if (sim.extractors.length === 0) return;

  // Батчинг extractors (см. wiki/plans/physics_sim_fps_optimization.md,
  // Этапы 0/A1): по одному command buffer на дисптач извлечения каждого
  // cloth-объекта + ОДИН дополнительный command buffer, копирующий все
  // per-объектные dstBuf в единый sim.readbackBuf. Все command buffers
  // одной очереди устройства исполняются строго в порядке массива
  // (гарантия WebGPU), поэтому copy-буфер, идущий последним, гарантированно
  // видит уже готовые результаты всех дисптачей — явный
  // await onSubmittedWorkDone() между ними не нужен.
  const commandBuffers: GPUCommandBuffer[] = sim.extractors.map(({ kernel }) => kernel.runPass().finish());

  const copyEncoder = sim.ctx.device.createCommandEncoder({ label: 'extract_readback_copy' });
  let byteOffset = 0;
  for (const { kernel } of sim.extractors) {
    const byteLength = kernel.vertexCount * 3 * 4;
    copyEncoder.copyBufferToBuffer(kernel.dstBuf.buffer, 0, sim.readbackBuf, byteOffset, byteLength);
    byteOffset += byteLength;
  }
  commandBuffers.push(copyEncoder.finish());

  // ОДИН submit на весь кадр (было N) + ОДИН mapAsync (было N) — единственная
  // точка CPU↔GPU синхронизации за кадр вместо 2×N.
  sim.ctx.device.queue.submit(commandBuffers);
  await sim.readbackBuf.mapAsync(GPUMapMode.READ);
  try {
    const mapped = sim.readbackBuf.getMappedRange();
    byteOffset = 0;
    for (const { objectId, kernel } of sim.extractors) {
      const floatCount = kernel.vertexCount * 3;
      const geom = getPhysicsGeometry(objectId);
      if (geom) {
        const attr = geom.attributes.position as THREE.BufferAttribute;
        // View поверх mapped напрямую (без промежуточного clone) — валидна
        // только до unmap() ниже, .set() копирует данные в attr.array сразу.
        (attr.array as Float32Array).set(new Float32Array(mapped, byteOffset, floatCount));
        attr.needsUpdate = true;
        geom.computeVertexNormals()
        // computeVertexNormals() каждый кадр — заметная CPU-нагрузка на плотных
        // мешах; для MVP пропускаем (нормали остаются из rest-позы). См. Этап 7.
      }
      byteOffset += floatCount * 4;
    }
  } finally {
    // Гарантируем unmap даже при ошибке разбора — иначе буфер навсегда
    // застревает "mapped", и следующий кадр падает на повторном mapAsync().
    sim.readbackBuf.unmap();
  }
}

function destroySimulation(sim: ActiveSim): void {
  sim.scene.destroy();
  for (const { kernel } of sim.extractors) {
    kernel.dstBuf.destroy();
    kernel.paramsBuf.destroy();
  }
  sim.readbackBuf.destroy();
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

interface PhysicsSimControllerProps {
  /** Вызывается при активации/деактивации drag-инструмента (см. DragTool ниже) —
   * используется SceneView для отключения OrbitControls, пока активен режим drag. */
  onDragToolActiveChange?: (active: boolean) => void;
}

export function PhysicsSimController({ onDragToolActiveChange }: PhysicsSimControllerProps = {}) {
  const simMode = useEditorStore((s) => s.simMode);
  const stopSimulation = useEditorStore((s) => s.stopSimulation);
  const activeRef = useRef<ActiveSim | null>(null);
  const startingRef = useRef(false);
  const dragToolRef = useRef<DragTool | null>(null);
  const { camera, gl } = useThree();

  // Drag-инструмент (перетаскивание ткани мышью) — переключается нажатием
  // DRAG_TOOL_KEY (не удержанием): нажал — вошли в режим drag, камера
  // заблокирована; нажал ещё раз — вернулись к управлению камерой. Управление
  // камерой (OrbitControls) отключается на всё время, пока режим drag активен,
  // через onDragToolActiveChange. Поэтому объект controls, который получает
  // сам DragTool — заглушка: реальным включением/выключением OrbitControls
  // управляет React (см. CameraControls в SceneView.tsx), а не
  // DragTool.renderer.controls.
  const releaseDragTool = () => {
    if (!dragToolRef.current) return;
    dragToolRef.current.dispose();
    dragToolRef.current = null;
    onDragToolActiveChange?.(false);
  };

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.code !== DRAG_TOOL_KEY || ev.repeat) return;
      const target = ev.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      // Уже в режиме drag — второе нажатие переключает обратно на камеру,
      // это допустимо в любой момент (даже если симуляция успела остановиться).
      if (dragToolRef.current) {
        ev.preventDefault();
        releaseDragTool();
        return;
      }

      if (useEditorStore.getState().simMode !== 'simulate' || !activeRef.current) return;
      ev.preventDefault();

      // wgpu_utils и 3d-configurator/client — соседние репозитории, не единый npm
      // workspace, поэтому у каждого свой физический пакет `three` в node_modules —
      // camera из useThree() (three клиента) и THREE.Camera из DragToolRendererLike
      // (three wgpu_utils) структурно идентичны в рантайме, но TS видит их как разные
      // номинальные типы (приватные поля брендируют класс). DragTool использует только
      // публичный API (Raycaster.setFromCamera/getWorldDirection) — каст безопасен.
      const renderer = {
        domElement: gl.domElement,
        camera,
        controls: { enabled: true },
      } as unknown as DragToolRendererLike;
      dragToolRef.current = new DragTool(activeRef.current.ctx, renderer, activeRef.current.scene);
      onDragToolActiveChange?.(true);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', releaseDragTool);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', releaseDragTool);
      releaseDragTool();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, gl]);

  // Если симуляция ставится на паузу/останавливается, пока активен режим
  // drag — инструмент больше не на чем работать (см. runFrame ниже —
  // активный dragSlot без шагов солвера просто "подвисает"), снимаем его.
  useEffect(() => {
    if (simMode !== 'simulate') releaseDragTool();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simMode]);

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
