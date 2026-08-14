/**
 * Клиент для файлового API сцен wgpu_utils (newton/user_geometry) — Next.js
 * сервер в wgpu_utils/server, эндпоинты /api/scene/list и /api/scene/read
 * (см. wgpu_utils/server/pages/api/scene/{list,read}.ts). Возвращает
 * A CORS: * — прямой cross-origin fetch с порта Vite-дева работает без
 * дополнительного прокси.
 *
 * Не путать с client/src/api/scenesApi.ts — тот работает с Postgres-бэкендом
 * САМОГО 3d-configurator и физических (physicsMesh) сцен не касается,
 * см. wiki/plans/3d_configurator_integration.md, решение №2.
 */

import { nanoid } from 'nanoid';
import * as THREE from 'three';
import type {
  SceneObjectData,
  PhysicsMeshData,
  PhysicsMaterialProperties,
} from '@shared/types/scene';
import { PhysicsMeshType } from '@shared/types/scene';
import {
  zUpToYUpPositions,
  zUpToYUpVec3,
  zUpToYUpQuat,
  zUpToYUpScale,
  yUpToZUpVec3,
  yUpToZUpQuat,
  yUpToZUpScale,
} from '@/utils/zUpToYUp';

/**
 * Порт wgpu_utils/server (`next dev`) должен отличаться от порта Vite-дева
 * 3d-configurator (3000) и его Express-бэкенда (3001) — см. открытый вопрос
 * №1 в wiki/plans/3d_configurator_integration.md, Этап 2. Запускать как
 * `next dev -p 3010` в wgpu_utils/server.
 */
export const DEFAULT_PHYSICS_SERVER = 'http://localhost:3010';

/**
 * localStorage-ключ адреса сервера, который пользователь ввёл в
 * PhysicsSceneDialog при импорте. Единственный источник правды для этого
 * значения — save-функции (saveObjectMeta/saveAllObjectsMeta) ДОЛЖНЫ читать
 * его тем же геттером, а не только диалог импорта, иначе сохранение бьёт по
 * DEFAULT_PHYSICS_SERVER независимо от того, что показано в UI (баг: адрес
 * из диалога использовался только для импорта, для сохранения — никогда).
 */
const SERVER_STORAGE_KEY = 'physicsSceneServer';

export function getStoredPhysicsServer(): string {
  return localStorage.getItem(SERVER_STORAGE_KEY) || DEFAULT_PHYSICS_SERVER;
}

export function setStoredPhysicsServer(server: string): void {
  localStorage.setItem(SERVER_STORAGE_KEY, server);
}

function sceneUrl(server: string, scene: string, filePath: string): string {
  return `${server}/api/scene/read?scene=${encodeURIComponent(scene)}&path=${encodeURIComponent(filePath)}`;
}

/**
 * fetch() бросает TypeError на сетевых сбоях (сервер не запущен/не тот
 * порт/CORS-блок) — единообразно во всех браузерах, независимо от текста
 * сообщения ("Failed to fetch" в Chrome, "NetworkError..." в Firefox и
 * т.д.). Оборачивает fetch() понятной подсказкой вместо голого TypeError.
 */
async function fetchWithHint(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    if (e instanceof TypeError) {
      const origin = new URL(url).origin;
      throw new Error(
        `Не удалось подключиться к ${origin} — проверьте, что wgpu_utils/server запущен и слушает именно этот адрес/порт (см. диалог импорта физ-сцены)`,
      );
    }
    throw e;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetchWithHint(url);
  if (!r.ok) throw new Error(`GET ${url}: ${r.status} ${r.statusText}`);
  return r.json() as Promise<T>;
}

async function fetchBin(url: string): Promise<ArrayBuffer> {
  const r = await fetchWithHint(url);
  if (!r.ok) throw new Error(`GET ${url}: ${r.status} ${r.statusText}`);
  return r.arrayBuffer();
}

/** GET /api/scene/list — список доступных сцен. */
export async function listPhysicsScenes(server = DEFAULT_PHYSICS_SERVER): Promise<string[]> {
  return fetchJson<string[]>(`${server}/api/scene/list`);
}

// ---------------------------------------------------------------------------
// seam_collection.json — только для просмотра (Этап 4b), см. wiki/plans/
// 3d_configurator_integration.md. Формат и cloth-local индексация —
// зеркало wgpu_utils/src/utils/user_geometry_loader.ts::loadSeamCollection.
// ---------------------------------------------------------------------------

export interface SeamEntry {
  stitches: Array<[number, number]>;
  stiffness: number;
  subtype: string;
  angle: number;
}

export interface SeamCollection {
  seams: SeamEntry[];
}

/** Загружает seam_collection.json сцены; {seams: []}, если файла нет (404). */
export async function loadSeamCollection(
  sceneName: string,
  server = DEFAULT_PHYSICS_SERVER,
): Promise<SeamCollection> {
  const url = sceneUrl(server, sceneName, 'seam_collection.json');
  const r = await fetchWithHint(url);
  if (r.status === 404) return { seams: [] };
  if (!r.ok) throw new Error(`GET ${url}: ${r.status} ${r.statusText}`);
  const raw = (await r.json()) as {
    seams?: Array<{ stitches?: Array<[number, number]>; stiffness?: number; subtype?: string; angle?: number }>;
  };
  return {
    seams: (raw.seams ?? []).map((s) => ({
      stitches: s.stitches ?? [],
      stiffness: s.stiffness ?? 0.001,
      subtype: s.subtype ?? 'default',
      angle: s.angle ?? 0,
    })),
  };
}

// ---------------------------------------------------------------------------
// fixed_points.json — { [uuid]: number[] } | [] (пустая сцена без закреплений)
// ---------------------------------------------------------------------------

function parseFixedPoints(raw: unknown): Map<string, number[]> {
  const map = new Map<string, number[]>();
  if (Array.isArray(raw)) return map;
  if (raw && typeof raw === 'object') {
    for (const [uuid, indices] of Object.entries(raw as Record<string, unknown>)) {
      if (Array.isArray(indices)) map.set(uuid, indices as number[]);
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// meta.json
// ---------------------------------------------------------------------------

interface MetaJson {
  uuid: string;
  physics_type: number; // 1 = Cloth, 2 = Static — см. PhysicsType в scene_sim_input.ts
  ortho_stiffness?: number;
  volume?: number;
  damping?: number;
  loc: [number, number, number];
  rot: [number, number, number, number]; // xyzw
  scale: [number, number, number];
  material_properties?: Partial<PhysicsMaterialProperties>;
}

const DEFAULT_MATERIAL_PROPERTIES: PhysicsMaterialProperties = {
  m_stretch_stiffness: 0,
  m_young_weft: 0,
  m_young_warp: 0,
  m_shear_modulus: 0,
  m_poisson_weft: 0,
  m_poisson_warp: 0,
  m_friction_coeff: 0,
  m_thickness: 0.001,
  m_bending_stiffness: 0,
  m_bending_warp: 0,
  m_bending_weft: 0,
  m_bending_shear: 0,
  m_density: 0.1,
  m_bend_dissipation_warp: 0,
  m_stretch_dissipation_warp: 0,
  layer: 0,
};

async function loadPhysicsMeshObject(
  uuid: string,
  sceneName: string,
  server: string,
  fixedPoints: Map<string, number[]>,
): Promise<SceneObjectData> {
  const url = (path: string) => sceneUrl(server, sceneName, path);

  const meta = await fetchJson<MetaJson>(url(`${uuid}/meta.json`));
  const physicsType: PhysicsMeshType =
    meta.physics_type === PhysicsMeshType.Cloth ? PhysicsMeshType.Cloth : PhysicsMeshType.Static;
  const isCloth = physicsType === PhysicsMeshType.Cloth;

  const fetches: Promise<ArrayBuffer>[] = [
    fetchBin(url(`${uuid}/vertices.bin`)),
    fetchBin(url(`${uuid}/indices.bin`)),
  ];
  if (isCloth) fetches.push(fetchBin(url(`${uuid}/undeformed_mesh_2d.bin`)));

  const buffers = await Promise.all(fetches);
  const rawVerts = new Float32Array(buffers[0]); // stride 4: xyz + padding, ЛОКАЛЬНОЕ (Z-up)
  const indices = new Uint32Array(buffers[1]); // stride 3
  const rawUv2D = isCloth ? new Float32Array(buffers[2]) : undefined;

  const vertexCount = rawVerts.length / 4;
  // Убираем паддинг (stride 4 → 3) без смены координат — ось конвертируется ниже.
  const positionsZUp = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    positionsZUp[i * 3] = rawVerts[i * 4];
    positionsZUp[i * 3 + 1] = rawVerts[i * 4 + 1];
    positionsZUp[i * 3 + 2] = rawVerts[i * 4 + 2];
  }
  // Локальная геометрия — Z-up→Y-up один раз при импорте (см. zUpToYUp.ts).
  const positions = zUpToYUpPositions(positionsZUp);

  const materialProperties: PhysicsMaterialProperties = {
    ...DEFAULT_MATERIAL_PROPERTIES,
    ...meta.material_properties,
  };

  const physicsMesh: PhysicsMeshData = {
    sourceScene: sceneName,
    uuid,
    physicsType,
    vertexCount,
    primCount: indices.length / 3,
    orthoStiffness: meta.ortho_stiffness ?? 0,
    damping: meta.damping ?? 0,
    volume: meta.volume ?? 0,
    materialProperties,
    positions,
    indices,
    uv2D: rawUv2D,
    fixedVertices: fixedPoints.get(uuid) ?? [],
  };

  const positionYUp = zUpToYUpVec3(meta.loc[0], meta.loc[1], meta.loc[2]);
  const rotationYUpQuat = zUpToYUpQuat(meta.rot);
  const scaleYUp = zUpToYUpScale(meta.scale[0], meta.scale[1], meta.scale[2]);

  const threeQuat = new THREE.Quaternion(
    rotationYUpQuat[0],
    rotationYUpQuat[1],
    rotationYUpQuat[2],
    rotationYUpQuat[3],
  );
  const euler = new THREE.Euler().setFromQuaternion(threeQuat, 'XYZ');

  return {
    id: nanoid(),
    name: uuid,
    type: 'physicsMesh',
    physicsMesh,
    position: positionYUp,
    rotation: [euler.x, euler.y, euler.z],
    scale: scaleYUp,
    material: {
      color: isCloth ? '#ffcc44' : '#666677',
      metalness: 0.1,
      roughness: 0.8,
    },
    visible: true,
    locked: false,
  };
}

/**
 * Загружает сцену newton/user_geometry целиком как массив SceneObjectData
 * для useSceneStore.loadObjects(). См. wiki/plans/3d_configurator_integration.md,
 * Этап 2.
 */
export async function loadPhysicsScene(
  sceneName: string,
  server = DEFAULT_PHYSICS_SERVER,
): Promise<SceneObjectData[]> {
  const uuids = await fetchJson<string[]>(sceneUrl(server, sceneName, 'objects_index.json'));
  const fixedRaw = await fetchJson<unknown>(sceneUrl(server, sceneName, 'fixed_points.json'));
  const fixedPoints = parseFixedPoints(fixedRaw);

  return Promise.all(uuids.map((uuid) => loadPhysicsMeshObject(uuid, sceneName, server, fixedPoints)));
}

// ---------------------------------------------------------------------------
// POST /api/scene/write-meta — сохранение transform + material_properties
// ---------------------------------------------------------------------------

interface WriteMetaPatch {
  loc?: [number, number, number];
  rot?: [number, number, number, number];
  scale?: [number, number, number];
  material_properties?: Record<string, number>;
  ortho_stiffness?: number;
  damping?: number;
}

/**
 * Сохраняет transform (position/rotation/scale) + material_properties/
 * ortho_stiffness/damping объекта обратно в meta.json на диске — ТОЛЬКО эти
 * поля (allow-list на сервере), геометрия/швы не трогаются, см.
 * wiki/plans/3d_configurator_integration.md, Этап 5.
 *
 * Обратная (Y-up → Z-up) конвертация — зеркало того, что делает
 * loadPhysicsMeshObject() при импорте.
 */
export async function saveObjectMeta(object: SceneObjectData, server = DEFAULT_PHYSICS_SERVER): Promise<void> {
  const pm = object.physicsMesh;
  if (!pm) throw new Error(`saveObjectMeta: object "${object.id}" has no physicsMesh data`);

  const locZUp = yUpToZUpVec3(object.position[0], object.position[1], object.position[2]);
  const scaleZUp = yUpToZUpScale(object.scale[0], object.scale[1], object.scale[2]);

  const threeQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(object.rotation[0], object.rotation[1], object.rotation[2], 'XYZ'),
  );
  const rotZUp = yUpToZUpQuat([threeQuat.x, threeQuat.y, threeQuat.z, threeQuat.w]);

  const patch: WriteMetaPatch = {
    loc: locZUp,
    rot: rotZUp,
    scale: scaleZUp,
    material_properties: { ...pm.materialProperties },
    ortho_stiffness: pm.orthoStiffness,
    damping: pm.damping,
  };

  const res = await fetchWithHint(`${server}/api/scene/write-meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene: pm.sourceScene, uuid: pm.uuid, patch }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`POST /api/scene/write-meta: ${res.status} ${res.statusText} ${body}`);
  }
}

export interface SaveAllMetaResult {
  saved: string[];
  failed: { name: string; error: string }[];
}

/**
 * Сохраняет transform + material_properties ВСЕХ physicsMesh-объектов сцены
 * (не только выбранного, в отличие от saveObjectMeta() выше) — по одному
 * write-meta на объект, параллельно. Объекты из разных исходных сцен
 * (physicsMesh.sourceScene) сохраняются корректно каждый в свою — sourceScene
 * хранится per-object, а не глобально для редактора.
 */
export async function saveAllObjectsMeta(
  objects: SceneObjectData[],
  server = DEFAULT_PHYSICS_SERVER,
): Promise<SaveAllMetaResult> {
  const physicsObjects = objects.filter((o) => o.type === 'physicsMesh' && o.physicsMesh);
  const settled = await Promise.allSettled(physicsObjects.map((o) => saveObjectMeta(o, server)));

  const saved: string[] = [];
  const failed: { name: string; error: string }[] = [];
  settled.forEach((result, i) => {
    const obj = physicsObjects[i];
    if (result.status === 'fulfilled') {
      saved.push(obj.name);
    } else {
      const error = result.reason instanceof Error ? result.reason.message : String(result.reason);
      failed.push({ name: obj.name, error });
    }
  });
  return { saved, failed };
}
