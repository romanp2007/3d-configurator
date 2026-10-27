/**
 * Физика произвольных объектов редактора: допустимые комбинации «тип физики ×
 * коллайдер», значения по умолчанию, получение локального меша объекта и
 * подгонка аналитических коллайдеров по мешу.
 *
 * Чистая логика без React/GPU — используется и UI (ObjectPhysicsSection), и
 * buildSceneSimInputFromEditor. См. wiki/plans/3d_configurator_physics_objects.md.
 */

import {
  boundsCenter,
  meshBounds,
  meshVolumeAndCom,
  weldMesh,
  type Vec3,
} from '@wgpu/geometry/mesh_utils';
import type { MeshData } from '@wgpu/geometry/primitives';
import type {
  ObjectSim,
  PhysicsMaterialProperties,
  SceneObjectData,
  SimColliderKind,
  SimColliderSettings,
  SimPhysicsType,
} from '@shared/types/scene';
import { PhysicsMeshType } from '@shared/types/scene';
import { getLoadedAssetMesh } from '@/assets/assetLibrary';
import { buildPrimitiveMesh, isPrimitiveType, resolveGeometryParams, PRIMITIVE_AXIS_HINT } from './primitiveMesh';

// ---------------------------------------------------------------------------
// Значения по умолчанию
// ---------------------------------------------------------------------------

/**
 * Параметры ткани по умолчанию — те же, что у лоскута в showcase-сцене
 * chair_cloth (tests/showcase/common.ts::makeSquareCloth): ku=kv=1e4, ks=300,
 * изгиб 1e-5, плотность 0.15 кг/м², толщина 3 мм.
 */
export const DEFAULT_CLOTH_MATERIAL: PhysicsMaterialProperties = {
  m_stretch_stiffness: 0,
  m_young_weft: 1e4,
  m_young_warp: 1e4,
  m_shear_modulus: 300,
  m_poisson_weft: 0,
  m_poisson_warp: 0,
  m_friction_coeff: 0.3,
  m_thickness: 0.003,
  m_bending_stiffness: 0,
  m_bending_warp: 1e-5,
  m_bending_weft: 1e-5,
  m_bending_shear: 1e-5,
  m_density: 0.15,
  m_bend_dissipation_warp: 0,
  m_stretch_dissipation_warp: 0,
  layer: 0,
};

export function defaultSim(): ObjectSim {
  return {
    physicsType: 'none',
    collider: { kind: 'mesh', auto: true },
    rigid: { density: 500 },
    cloth: { materialProperties: { ...DEFAULT_CLOTH_MATERIAL }, pinned: 'none' },
  };
}

/** sim объекта с подставленными значениями по умолчанию (старые сцены без sim = 'none'). */
export function getSim(obj: SceneObjectData): ObjectSim {
  return obj.sim ?? defaultSim();
}

// ---------------------------------------------------------------------------
// Допустимые комбинации
// ---------------------------------------------------------------------------

export const PHYSICS_TYPE_LABELS: Record<SimPhysicsType, string> = {
  none: 'Нет (без физики)',
  static: 'Static (неподвижный)',
  rigid: 'Rigid (твёрдое тело)',
  cloth: 'Cloth (ткань)',
};

export const COLLIDER_LABELS: Record<SimColliderKind, string> = {
  mesh: 'Меш (треугольники)',
  box: 'Box',
  sphere: 'Сфера',
  capsule: 'Капсула',
  cylinder: 'Цилиндр',
};

/**
 * Какие типы физики доступны объекту. Объекты `physicsMesh` управляются
 * отдельной секцией (PhysicsSection) и этой логикой не затрагиваются.
 */
export function allowedPhysicsTypes(obj: SceneObjectData): SimPhysicsType[] {
  if (obj.type === 'assetMesh') return ['none', 'static', 'rigid'];
  if (obj.type === 'plane') return ['none', 'static', 'cloth']; // незамкнутая — rigid без объёма смысла не имеет
  if (isPrimitiveType(obj.type)) return ['none', 'static', 'rigid'];
  return ['none']; // model (GLB) и прочее
}

export function allowedColliders(physicsType: SimPhysicsType): SimColliderKind[] {
  return physicsType === 'rigid' ? ['mesh', 'box', 'sphere', 'capsule', 'cylinder'] : ['mesh'];
}

/** Для physicsMesh: Static→Cloth возможно только при наличии uv2D. */
export function allowedPhysicsMeshTypes(obj: SceneObjectData): PhysicsMeshType[] {
  const pm = obj.physicsMesh;
  if (!pm) return [];
  return pm.uv2D ? [PhysicsMeshType.Cloth, PhysicsMeshType.Static] : [PhysicsMeshType.Static];
}

// ---------------------------------------------------------------------------
// Локальный меш объекта (без transform и scale)
// ---------------------------------------------------------------------------

const weldedPrimitiveCache = new Map<string, MeshData>();

/**
 * Меш для физики в ЛОКАЛЬНОМ пространстве объекта, до scale:
 *  - примитив: для plane — как есть (сетка без дублей, порядок вершин = рендер-геометрии
 *    ткани); для остальных — склеенный;
 *  - assetMesh: склеенный меш ассета (null, пока ассет не загружен);
 *  - physicsMesh: positions/indices импорта.
 */
export function getCollisionMesh(obj: SceneObjectData): MeshData | null {
  if (isPrimitiveType(obj.type)) {
    const params = resolveGeometryParams(obj.type, obj.geometry);
    if (obj.type === 'plane') return buildPrimitiveMesh('plane', params);
    const key = `${obj.type}:${JSON.stringify(params)}`;
    let m = weldedPrimitiveCache.get(key);
    if (!m) {
      m = weldMesh(buildPrimitiveMesh(obj.type, params));
      if (weldedPrimitiveCache.size > 64) weldedPrimitiveCache.clear();
      weldedPrimitiveCache.set(key, m);
    }
    return m;
  }
  if (obj.type === 'assetMesh' && obj.assetMesh) {
    return getLoadedAssetMesh(obj.assetMesh.assetId)?.collision ?? null;
  }
  if (obj.type === 'physicsMesh' && obj.physicsMesh) {
    return { vertices: obj.physicsMesh.positions, indices: obj.physicsMesh.indices };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Подгонка коллайдера по мешу
// ---------------------------------------------------------------------------

/**
 * Параметры коллайдера заданного вида, подогнанные под локальный меш (AABB для
 * box; описанные сфера/цилиндр/капсула вокруг центра AABB). `axisHint` — ось
 * осевого примитива (цилиндр/конус/тор — Y); иначе ось = самое длинное
 * измерение AABB. Возвращает auto: false — готовые размеры (для «заморозки»
 * автоподгонки в ручные значения).
 */
export function fitCollider(
  kind: SimColliderKind,
  mesh: MeshData,
  axisHint?: 0 | 1 | 2,
): SimColliderSettings {
  const b = meshBounds(mesh);
  const c = boundsCenter(b);
  const half: Vec3 = [(b.max[0] - b.min[0]) / 2, (b.max[1] - b.min[1]) / 2, (b.max[2] - b.min[2]) / 2];
  const base: SimColliderSettings = { kind, auto: false, center: c };

  if (kind === 'box') return { ...base, halfExtents: half };

  const p = mesh.vertices;
  if (kind === 'sphere') {
    let r2 = 0;
    for (let i = 0; i < p.length; i += 3) {
      const dx = p[i] - c[0], dy = p[i + 1] - c[1], dz = p[i + 2] - c[2];
      r2 = Math.max(r2, dx * dx + dy * dy + dz * dz);
    }
    return { ...base, radius: Math.sqrt(r2) };
  }

  if (kind === 'capsule' || kind === 'cylinder') {
    let axis: 0 | 1 | 2 = axisHint ?? 0;
    if (axisHint === undefined) {
      if (half[1] > half[axis]) axis = 1;
      if (half[2] > half[axis]) axis = 2;
    }
    const a1 = (axis + 1) % 3, a2 = (axis + 2) % 3;
    let r2 = 0;
    for (let i = 0; i < p.length; i += 3) {
      const d1 = p[i + a1] - c[a1], d2 = p[i + a2] - c[a2];
      r2 = Math.max(r2, d1 * d1 + d2 * d2);
    }
    const radius = Math.sqrt(r2);
    // Капсула: полудлина цилиндрической части — без полусферических колпачков.
    const halfLength = kind === 'capsule' ? Math.max(0, half[axis] - radius) : half[axis];
    return { ...base, radius, halfLength, axis };
  }

  return { kind: 'mesh', auto: true };
}

/**
 * Фактические параметры коллайдера объекта: при auto — подгонка по мешу, иначе
 * сохранённые поля (с запасными значениями для неполностью заданных).
 */
export function resolveCollider(obj: SceneObjectData, mesh: MeshData): SimColliderSettings {
  const col = getSim(obj).collider;
  if (col.kind === 'mesh') return { kind: 'mesh', auto: true };
  const hint = isPrimitiveType(obj.type) ? PRIMITIVE_AXIS_HINT[obj.type] : undefined;
  const fitted = fitCollider(col.kind, mesh, hint);
  if (col.auto) return fitted;
  return {
    ...fitted,
    auto: false,
    center: col.center ?? fitted.center,
    halfExtents: col.halfExtents ?? fitted.halfExtents,
    radius: col.radius ?? fitted.radius,
    halfLength: col.halfLength ?? fitted.halfLength,
    axis: col.axis ?? fitted.axis,
  };
}

// ---------------------------------------------------------------------------
// Масса rigid-тела
// ---------------------------------------------------------------------------

/** Объём (м³) аналитического коллайдера с УЖЕ применённым scale. */
export function colliderVolume(kind: SimColliderKind, d: {
  halfExtents?: Vec3; radius?: number; halfLength?: number;
}): number {
  const r = d.radius ?? 0, hl = d.halfLength ?? 0;
  switch (kind) {
    case 'box': {
      const h = d.halfExtents ?? [0, 0, 0];
      return 8 * h[0] * h[1] * h[2];
    }
    case 'sphere': return (4 / 3) * Math.PI * r ** 3;
    case 'cylinder': return Math.PI * r * r * 2 * hl;
    case 'capsule': return Math.PI * r * r * 2 * hl + (4 / 3) * Math.PI * r ** 3;
    default: return 0;
  }
}

/** Объём и центр масс mesh-коллайдера в локальных координатах (до scale). */
export function meshVolumeCom(mesh: MeshData): { volume: number; com: Vec3 } {
  const r = meshVolumeAndCom(mesh);
  // Незамкнутый меш (объём ≈ 0) — центр масс = центр AABB.
  if (!(r.volume > 1e-9) || !r.com.every(Number.isFinite)) {
    return { volume: 0, com: boundsCenter(meshBounds(mesh)) };
  }
  return r;
}

// ---------------------------------------------------------------------------
// Коллайдер с применённым scale объекта (общий для билдера и оверлея)
// ---------------------------------------------------------------------------

export interface ScaledCollider {
  kind: Exclude<SimColliderKind, 'mesh'>;
  /** Центр в ЛОКАЛЬНЫХ координатах объекта (до scale). */
  center: Vec3;
  /** box: полуразмеры по осям X/Y/Z с учётом |scale|. */
  halfExtents?: Vec3;
  /** sphere/capsule/cylinder: радиус с учётом scale (поперёк оси — по среднему). */
  radius?: number;
  /** capsule/cylinder: полудлина вдоль оси с учётом scale. */
  halfLength?: number;
  axis: 0 | 1 | 2;
  /** Предупреждения о неравномерном scale. */
  warnings: string[];
}

/**
 * Аналитический коллайдер объекта в единицах мира (scale применён); null — если у
 * объекта mesh-коллайдер. Радиус сферы/цилиндра при неравномерном scale усредняется
 * (аналитические формы не умеют эллипсоиды) — об этом сообщается в warnings.
 */
export function scaledCollider(obj: SceneObjectData, mesh: MeshData): ScaledCollider | null {
  const c = resolveCollider(obj, mesh);
  if (c.kind === 'mesh') return null;
  const kind = c.kind;
  const s = obj.scale;
  const abs: Vec3 = [Math.abs(s[0]), Math.abs(s[1]), Math.abs(s[2])];
  const center: Vec3 = c.center ?? [0, 0, 0];
  const warnings: string[] = [];

  if (kind === 'box') {
    const he = c.halfExtents ?? [0.5, 0.5, 0.5];
    return { kind, center, axis: 1, halfExtents: [he[0] * abs[0], he[1] * abs[1], he[2] * abs[2]], warnings };
  }

  const uneven = (a: number, b: number) => a > 1.01 * b || b > 1.01 * a;
  if (kind === 'sphere') {
    if (uneven(Math.max(...abs), Math.min(...abs))) {
      warnings.push(`«${obj.name}»: неравномерный scale у сферы — радиус взят по среднему`);
    }
    return { kind, center, axis: 1, radius: (c.radius ?? 0.5) * ((abs[0] + abs[1] + abs[2]) / 3), warnings };
  }

  const axis = c.axis ?? 1;
  const a1 = (axis + 1) % 3, a2 = (axis + 2) % 3;
  if (uneven(abs[a1], abs[a2])) {
    warnings.push(`«${obj.name}»: неравномерный scale поперёк оси — радиус взят по среднему`);
  }
  return {
    kind,
    center,
    axis,
    radius: (c.radius ?? 0.5) * ((abs[a1] + abs[a2]) / 2),
    halfLength: (c.halfLength ?? 0.5) * abs[axis],
    warnings,
  };
}

/** Масса и объём rigid-тела объекта (для отображения в UI; билдер считает то же самое). */
export function estimateRigidMass(obj: SceneObjectData, mesh: MeshData): { mass: number; volume: number } {
  const sim = getSim(obj);
  const det = Math.abs(obj.scale[0] * obj.scale[1] * obj.scale[2]);
  const sc = sim.collider.kind === 'mesh' ? null : scaledCollider(obj, mesh);
  const volume = sc
    ? colliderVolume(sc.kind, { halfExtents: sc.halfExtents, radius: sc.radius, halfLength: sc.halfLength })
    : meshVolumeCom(mesh).volume * det;
  return { volume, mass: sim.rigid.mass ?? sim.rigid.density * volume };
}
