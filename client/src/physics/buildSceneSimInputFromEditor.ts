/**
 * Живой стор редактора (SceneObjectData[]) → SceneSimInput для
 * Style3DSolverScene. Аналог loadSceneSimInput() из wgpu_utils/src/utils/
 * user_geometry_loader.ts, но источник данных — не диск, а текущее
 * (возможно, отредактированное) состояние стора. Всё в Y-up (см.
 * physicsSceneApi.ts) — дополнительной конвертации осей здесь не нужно.
 *
 * В симуляцию попадают видимые объекты:
 *   - `physicsMesh` (импорт newton/user_geometry): Static или Cloth по physicsMesh.physicsType;
 *   - любые другие (примитивы, assetMesh) с `sim.physicsType` ≠ 'none':
 *       static — меш как есть;
 *       rigid  — динамическое тело: mesh-коллайдер (треугольники) или аналитический
 *                (box/sphere/capsule/cylinder);
 *       cloth  — только плоскость (сетка с uv2D из размеров объекта).
 *
 * Системы координат тела (rigid): начало тела = ЦЕНТР МАСС (loc = COM в мире,
 * positions относительно него, см. scene_to_solver.ts: restLocal = R0ᵀ(getMat4·p − loc)).
 * scale объекта ЗАПЕКАЕТСЯ в позиции rigid-меша (инерция по мешу, updateInertiaTensor,
 * scale не учитывает) и в размеры аналитического коллайдера; у static/cloth scale
 * остаётся в PhysObject.scale (применяется через getMat4).
 *
 * Порядок объектов: buildSceneInput() сам раскладывает static → rigid → cloth и
 * проставляет vertexOffset/faceOffset. Внутри cloth сначала идут physicsMesh (в порядке
 * стора) и только потом плоскости — cloth-local индексы стежков швов (seam_collection)
 * относятся к physicsMesh-ткани и не должны сдвигаться, см. buildClothLocalResolver в
 * PhysicsDebugOverlay.tsx.
 */

import * as THREE from 'three';
import { quat as glQuat, vec3 as glVec3, mat4 as glMat4 } from 'gl-matrix';
import type { ObjectSim, SceneObjectData } from '@shared/types/scene';
import { PhysicsMeshType } from '@shared/types/scene';
import {
  PhysicsType,
  PhysObject,
  buildSceneInput,
  type SceneSimInput,
} from '@wgpu/physics/solver/scene_sim_input';
import { ColliderKind } from '@wgpu/physics/rigid_body/analytic_collider';
import { shiftMesh, scaleMesh, type Vec3 } from '@wgpu/geometry/mesh_utils';
import { loadAssetMesh } from '@/assets/assetLibrary';
import {
  allowedPhysicsTypes,
  colliderVolume,
  getCollisionMesh,
  getSim,
  meshVolumeCom,
  scaledCollider,
} from './objectPhysics';
import { resolveGeometryParams, isPrimitiveType } from './primitiveMesh';

function eulerToGlQuat(rotation: [number, number, number]): glQuat {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ'));
  return glQuat.fromValues(q.x, q.y, q.z, q.w);
}

// PhysicsMeshType (shared/types/scene.ts, независим от wgpu_utils — общий
// с Express-сервером 3d-configurator, у которого нет доступа к @wgpu/*) и
// PhysicsType (wgpu_utils/src) — два независимо объявленных enum с
// ОДИНАКОВЫМИ числовыми значениями (1=Cloth, 2=Static). TS не даёт сравнивать
// значения двух разных enum-типов напрямую (TS2367) — сравниваем как числа.
function isClothMesh(physicsType: PhysicsMeshType): boolean {
  return (physicsType as number) === (PhysicsType.Cloth as number);
}

/** Половина стороны пола [м] — плоскость 2×GROUND_PLANE_HALF_SIZE. */
const GROUND_PLANE_HALF_SIZE = 25;

/** Мягкий предел числа треугольников статики+rigid, выше которого предупреждаем о производительности. */
const TRIANGLE_WARN_LIMIT = 60_000;

/**
 * Синтетический статический коллайдер — плоскость пола на y=0, всегда
 * добавляется первым STATIC-объектом сцены. Не соответствует никакому
 * SceneObjectData (не выбирается/не редактируется в редакторе — совпадает
 * визуально с декоративной плоскостью пола в SceneView.tsx, но именно ЭТОТ
 * объект участвует в коллизиях, декоративная — нет).
 */
function buildGroundPlanePhysObject(): PhysObject {
  const s = GROUND_PLANE_HALF_SIZE;
  const positions = new Float32Array([
    -s, 0, -s,
    -s, 0, s,
    s, 0, s,
    s, 0, -s,
  ]);
  // (v0,v1,v2) и (v0,v2,v3): cross(v1-v0, v2-v0) = (0, 4s², 0) — нормаль вверх.
  const faces = new Uint32Array([0, 1, 2, 0, 2, 3]);

  return new PhysObject({
    uuid: '__ground_plane__',
    physicsType: PhysicsType.Static,
    positions,
    faces,
    vertexCount: 4,
    primCount: 2,
    getMat4: () => glMat4.create(),
    vertexOffset: 0,
    faceOffset: 0,
    fixedVertices: [],
    loc: glVec3.create(),
    rot: glQuat.create(),
    scale: glVec3.fromValues(1, 1, 1),
  });
}

// ---------------------------------------------------------------------------
// Результат сборки
// ---------------------------------------------------------------------------

/** Положение rigid-тела относительно объекта редактора — нужно, чтобы вернуть позу тела в Object3D меша. */
export interface RigidFrame {
  /** id объекта редактора. */
  id: string;
  /** Центр масс в ЛОКАЛЬНЫХ координатах объекта (до scale): начало тела. */
  comLocal: Vec3;
  /** scale объекта (знаки сохранены). */
  scale: Vec3;
}

export interface EditorSimBuild {
  input: SceneSimInput;
  /** Rigid-тела в порядке bodyId (индекс = номер тела в RigidBodySolver). */
  rigid: RigidFrame[];
  /** Объекты-ткань в порядке слотов извлечения (id объекта редактора ↔ PhysObject). */
  cloth: { id: string; obj: PhysObject }[];
  /** Некритичные замечания (неравномерный scale у сферы и т. п.) — показывает контроллер. */
  warnings: string[];
}

/** Есть ли у объекта физика, учитываемая этим билдером. */
function simulatedKind(o: SceneObjectData): 'physicsMesh' | 'static' | 'rigid' | 'cloth' | null {
  if (!o.visible) return null;
  if (o.type === 'physicsMesh') return o.physicsMesh ? 'physicsMesh' : null;
  const sim = getSim(o);
  if (sim.physicsType === 'none') return null;
  return allowedPhysicsTypes(o).includes(sim.physicsType) ? sim.physicsType : null;
}

/** Подгружает все ассеты, нужные объектам с физикой (до buildSceneSimInputFromEditor). */
export async function ensureSimAssetsLoaded(objects: SceneObjectData[]): Promise<void> {
  const ids = new Set<string>();
  for (const o of objects) {
    if (o.type === 'assetMesh' && o.assetMesh && simulatedKind(o)) ids.add(o.assetMesh.assetId);
  }
  await Promise.all([...ids].map((id) => loadAssetMesh(id)));
}

// ---------------------------------------------------------------------------
// Построение PhysObject
// ---------------------------------------------------------------------------

function worldPoint(position: Vec3, rot: glQuat, scale: Vec3, local: Vec3): glVec3 {
  const v = glVec3.fromValues(local[0] * scale[0], local[1] * scale[1], local[2] * scale[2]);
  glVec3.transformQuat(v, v, rot);
  return glVec3.add(v, v, glVec3.fromValues(position[0], position[1], position[2]));
}

function buildPhysicsMeshObject(o: SceneObjectData): PhysObject {
  const pm = o.physicsMesh!;
  const cloth = isClothMesh(pm.physicsType);
  return new PhysObject({
    uuid: o.id,
    physicsType: cloth ? PhysicsType.Cloth : PhysicsType.Static,
    positions: pm.positions,
    faces: pm.indices,
    // Игнорируются конструктором PhysObject (пересчитывает из positions/
    // faces.length), но обязательны по типу IPhysObject — см. scene_sim_input.ts.
    vertexCount: pm.vertexCount,
    primCount: pm.primCount,
    getMat4: () => glMat4.create(),
    vertexOffset: 0,
    faceOffset: 0,
    uv2D: pm.uv2D,
    layer: pm.materialProperties.layer,
    fixedVertices: pm.fixedVertices ?? [],
    loc: glVec3.fromValues(o.position[0], o.position[1], o.position[2]),
    rot: eulerToGlQuat(o.rotation),
    scale: glVec3.fromValues(o.scale[0], o.scale[1], o.scale[2]),
    // Физические свойства материала:
    density: pm.materialProperties.m_density, // кг/м^2
    thickness: pm.materialProperties.m_thickness,
    stretchStiffness: pm.materialProperties.m_stretch_stiffness,
    ku: pm.materialProperties.m_young_warp,
    kv: pm.materialProperties.m_young_weft,
    ks: pm.materialProperties.m_shear_modulus,
    bendKu: pm.materialProperties.m_bending_warp,
    bendKv: pm.materialProperties.m_bending_weft,
    bendKs: pm.materialProperties.m_bending_shear,
  });
}

function buildStaticObject(o: SceneObjectData, mesh: { vertices: Float32Array; indices: Uint32Array }): PhysObject {
  return new PhysObject({
    uuid: o.id,
    physicsType: PhysicsType.Static,
    positions: mesh.vertices,
    faces: mesh.indices,
    vertexCount: mesh.vertices.length / 3,
    primCount: mesh.indices.length / 3,
    getMat4: () => glMat4.create(),
    vertexOffset: 0,
    faceOffset: 0,
    fixedVertices: [],
    loc: glVec3.fromValues(o.position[0], o.position[1], o.position[2]),
    rot: eulerToGlQuat(o.rotation),
    scale: glVec3.fromValues(o.scale[0], o.scale[1], o.scale[2]),
  });
}

/** Ткань из плоскости: сетка с uv2D (в метрах, с учётом scale), опционально закреплены углы. */
function buildClothPlaneObject(
  o: SceneObjectData,
  sim: ObjectSim,
  mesh: { vertices: Float32Array; indices: Uint32Array },
): PhysObject {
  const mp = sim.cloth.materialProperties;
  const n = mesh.vertices.length / 3;
  const uv2D = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    uv2D[i * 2] = mesh.vertices[i * 3] * o.scale[0];
    uv2D[i * 2 + 1] = mesh.vertices[i * 3 + 2] * o.scale[2];
  }

  const fixedVertices: number[] = [];
  if (sim.cloth.pinned === 'corners') {
    // createPlane: вершина (ix, iz) = iz·(segX+1) + ix.
    const p = resolveGeometryParams('plane', o.geometry);
    const nx = (p.segX as number) + 1, nz = (p.segZ as number) + 1;
    fixedVertices.push(0, nx - 1, (nz - 1) * nx, nz * nx - 1);
  }

  return new PhysObject({
    uuid: o.id,
    physicsType: PhysicsType.Cloth,
    positions: mesh.vertices,
    faces: mesh.indices,
    vertexCount: n,
    primCount: mesh.indices.length / 3,
    getMat4: () => glMat4.create(),
    vertexOffset: 0,
    faceOffset: 0,
    uv2D,
    fixedVertices,
    loc: glVec3.fromValues(o.position[0], o.position[1], o.position[2]),
    rot: eulerToGlQuat(o.rotation),
    scale: glVec3.fromValues(o.scale[0], o.scale[1], o.scale[2]),
    density: mp.m_density,
    thickness: mp.m_thickness,
    stretchStiffness: mp.m_stretch_stiffness,
    ku: mp.m_young_warp,
    kv: mp.m_young_weft,
    ks: mp.m_shear_modulus,
    bendKu: mp.m_bending_warp,
    bendKv: mp.m_bending_weft,
    bendKs: mp.m_bending_shear,
    external_damping: 0.05,
  });
}

/** Rigid-тело с mesh-коллайдером: центр масс по мешу, масштаб запечён в позиции. */
function buildRigidMeshObject(
  o: SceneObjectData,
  sim: ObjectSim,
  mesh: { vertices: Float32Array; indices: Uint32Array },
  warnings: string[],
): { obj: PhysObject; frame: RigidFrame } {
  const s = o.scale as Vec3;
  const { volume, com } = meshVolumeCom(mesh);
  const det = Math.abs(s[0] * s[1] * s[2]);
  let mass = sim.rigid.mass ?? sim.rigid.density * volume * det;
  if (!(mass > 0)) {
    warnings.push(`«${o.name}»: масса не определена (меш не замкнут?) — принято 1 кг; задайте массу явно`);
    mass = 1;
  }

  const rot = eulerToGlQuat(o.rotation);
  const loc = worldPoint(o.position, rot, s, com);
  const baked = scaleMesh(shiftMesh(mesh, com), s);

  const obj = new PhysObject({
    uuid: o.id,
    physicsType: PhysicsType.RigidBody,
    positions: baked.vertices,
    faces: baked.indices,
    vertexCount: baked.vertices.length / 3,
    primCount: baked.indices.length / 3,
    getMat4: () => glMat4.create(),
    vertexOffset: 0,
    faceOffset: 0,
    rigidBodyMass: mass,
    loc,
    rot,
    scale: glVec3.fromValues(1, 1, 1),
  });
  obj.updateInertiaTensor();
  return { obj, frame: { id: o.id, comLocal: com, scale: s } };
}

const COLLIDER_KIND_MAP = {
  box: ColliderKind.Box,
  sphere: ColliderKind.Sphere,
  capsule: ColliderKind.Capsule,
  cylinder: ColliderKind.Cylinder,
} as const;

/** Rigid-тело с аналитическим коллайдером (размеры подогнаны/заданы в локальных единицах, scale применяется в scaledCollider). */
function buildRigidColliderObject(
  o: SceneObjectData,
  sim: ObjectSim,
  mesh: { vertices: Float32Array; indices: Uint32Array },
  warnings: string[],
): { obj: PhysObject; frame: RigidFrame } {
  const s = o.scale as Vec3;
  const sc = scaledCollider(o, mesh)!;
  warnings.push(...sc.warnings);

  const collider: NonNullable<ConstructorParameters<typeof PhysObject>[0]['collider']> = {
    kind: COLLIDER_KIND_MAP[sc.kind],
    localCenter: [0, 0, 0], // начало тела = центр коллайдера
    halfExtents: sc.halfExtents,
    radius: sc.radius,
    halfLength: sc.halfLength,
  };
  if (sc.kind === 'capsule' || sc.kind === 'cylinder') {
    const dir: Vec3 = [0, 0, 0];
    dir[sc.axis] = 1;
    collider.localAxis = dir;
  }

  const volume = colliderVolume(sc.kind, { halfExtents: sc.halfExtents, radius: sc.radius, halfLength: sc.halfLength });
  let mass = sim.rigid.mass ?? sim.rigid.density * volume;
  if (!(mass > 0)) {
    warnings.push(`«${o.name}»: масса коллайдера нулевая — принято 1 кг`);
    mass = 1;
  }

  const rot = eulerToGlQuat(o.rotation);
  const loc = worldPoint(o.position, rot, s, sc.center);

  const obj = new PhysObject({
    uuid: o.id,
    physicsType: PhysicsType.RigidBody,
    positions: new Float32Array(0),
    faces: new Uint32Array(0),
    vertexCount: 0,
    primCount: 0,
    getMat4: () => glMat4.create(),
    vertexOffset: 0,
    faceOffset: 0,
    rigidBodyMass: mass,
    collider,
    loc,
    rot,
    scale: glVec3.fromValues(1, 1, 1),
  });
  obj.updateInertiaTensor();
  return { obj, frame: { id: o.id, comLocal: sc.center, scale: s } };
}

// ---------------------------------------------------------------------------
// Основная функция
// ---------------------------------------------------------------------------

/**
 * Собирает SceneSimInput из объектов редактора. Ассеты, использованные
 * объектами с физикой, должны быть уже загружены (ensureSimAssetsLoaded).
 */
export function buildSceneSimInputFromEditor(objects: SceneObjectData[]): EditorSimBuild {
  const warnings: string[] = [];
  const ground = buildGroundPlanePhysObject();

  const statics: PhysObject[] = [ground];
  const rigids: { obj: PhysObject; frame: RigidFrame }[] = [];
  const physicsMeshCloths: { id: string; obj: PhysObject }[] = [];
  const planeCloths: { id: string; obj: PhysObject }[] = [];

  for (const o of objects) {
    const kind = simulatedKind(o);
    if (!kind) continue;

    if (kind === 'physicsMesh') {
      const obj = buildPhysicsMeshObject(o);
      if (obj.physicsType === PhysicsType.Cloth) physicsMeshCloths.push({ id: o.id, obj });
      else statics.push(obj);
      continue;
    }

    const sim = getSim(o);
    const mesh = getCollisionMesh(o);
    if (!mesh || mesh.indices.length === 0) {
      warnings.push(`«${o.name}»: меш недоступен (ассет не загружен?) — объект пропущен`);
      continue;
    }
    if (o.scale.some((x) => x < 0)) {
      warnings.push(`«${o.name}»: отрицательный scale переворачивает нормали — результат контактов может быть неверным`);
    }

    if (kind === 'static') {
      statics.push(buildStaticObject(o, mesh));
    } else if (kind === 'cloth') {
      if (!isPrimitiveType(o.type) || o.type !== 'plane') continue; // защитно: allowedPhysicsTypes уже пропускает только plane
      planeCloths.push({ id: o.id, obj: buildClothPlaneObject(o, sim, mesh) });
    } else {
      rigids.push(sim.collider.kind === 'mesh'
        ? buildRigidMeshObject(o, sim, mesh, warnings)
        : buildRigidColliderObject(o, sim, mesh, warnings));
    }
  }

  const cloth = [...physicsMeshCloths, ...planeCloths];
  const input = buildSceneInput(
    ...statics,
    ...rigids.map((r) => r.obj),
    ...cloth.map((c) => c.obj),
  );

  const triangles = [...statics, ...rigids.map((r) => r.obj)].reduce((sum, p) => sum + p.primCount, 0);
  if (triangles > TRIANGLE_WARN_LIMIT) {
    warnings.push(`Статика и rigid-тела содержат ${triangles} треугольников — симуляция может быть медленной`);
  }

  return { input, rigid: rigids.map((r) => r.frame), cloth, warnings };
}
