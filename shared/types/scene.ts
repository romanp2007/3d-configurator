/**
 * Типы объектов сцены
 */
export type ObjectType =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'plane'
  | 'torus'
  | 'model'
  | 'physicsMesh'
  | 'assetMesh';

/**
 * Материал объекта
 */
export interface MaterialData {
  color: string;
  metalness: number;
  roughness: number;
  textureUrl?: string;
  /** Режим рендера "каркас" (THREE.Material.wireframe). Не задано = false. */
  wireframe?: boolean;
}

/**
 * physics_type объекта из meta.json (newton/user_geometry), см.
 * PhysicsType в wgpu_utils/src/physics/solver/scene_sim_input.ts.
 */
// Обычный enum, не const enum: под Vite dev-сервером (esbuild компилирует
// файлы по отдельности, без знания всей программы) `const enum`,
// импортированный из ДРУГОГО файла, ломается в рантайме ("does not provide
// an export named ...") — esbuild не умеет инлайнить его значения через
// границу модулей. См. wiki/changelog/3d_configurator_integration.md.
export enum PhysicsMeshType {
  Cloth = 1,
  Static = 2,
}

/**
 * Зеркало material_properties из meta.json — Style3D KES-F-подобные
 * параметры материала ткани. См. wiki/plans/3d_configurator_integration.md,
 * Этап 1 (открытый вопрос №3: маппинг на ku/kv/ks у PhysObject ещё не
 * сверен на момент написания — этот интерфейс лишь зеркалит то, что реально
 * лежит в файле, без интерпретации).
 */
export interface PhysicsMaterialProperties {
  m_stretch_stiffness: number;
  m_young_weft: number;
  m_young_warp: number;
  m_shear_modulus: number;
  m_poisson_weft: number;
  m_poisson_warp: number;
  m_friction_coeff: number;
  m_thickness: number;
  m_bending_stiffness: number;
  m_bending_warp: number;
  m_bending_weft: number;
  m_bending_shear: number;
  m_density: number;
  m_bend_dissipation_warp: number;
  m_stretch_dissipation_warp: number;
  /** Индекс слоя одежды (для многослойных сцен — коллизии между слоями). */
  layer: number;
}

/**
 * Данные объекта, импортированного из newton/user_geometry (сцена типа
 * scene1copy1). Геометрия (positions/indices/uv2D) — ЛОКАЛЬНОЕ (rest)
 * пространство, читается один раз при импорте и НЕ переписывается
 * редактором; мировой transform — обычные position/rotation/scale
 * SceneObjectData (как для type === 'model'), см. «Ключевая находка» в
 * wiki/plans/3d_configurator_integration.md.
 */
export interface PhysicsMeshData {
  /** Имя сцены — папка в newton/user_geometry. */
  sourceScene: string;
  /** Имя папки объекта внутри сцены. */
  uuid: string;
  physicsType: PhysicsMeshType;
  vertexCount: number;
  primCount: number;
  orthoStiffness: number;
  damping: number;
  volume: number;
  materialProperties: PhysicsMaterialProperties;
  /** Локальные позиции вершин: float32, stride 3 (xyz), из vertices.bin. */
  positions: Float32Array;
  /** Индексный буфер: uint32, stride 3, из indices.bin. */
  indices: Uint32Array;
  /** 2D rest-координаты (только Cloth): float32, stride 2, из undeformed_mesh_2d.bin. */
  uv2D?: Float32Array;
  /** Локальные индексы закреплённых вершин, из fixed_points.json. */
  fixedVertices?: number[];
}

// ---------------------------------------------------------------------------
// Физика произвольных объектов редактора
// (см. wiki/plans/3d_configurator_physics_objects.md)
// ---------------------------------------------------------------------------

/**
 * Дискретизация примитива. Размер примитива задаётся scale объекта (все
 * примитивы — единичные), здесь только число сегментов. Неуказанные поля
 * берутся из DEFAULT_GEOMETRY_PARAMS (client/src/physics/primitiveMesh.ts).
 * Какие поля читаются — зависит от type объекта:
 *   box      — segX, segY, segZ
 *   plane    — segX, segZ
 *   sphere   — latSegments, lonSegments
 *   cylinder, cone — radialSegments, heightSegments
 *   torus    — majorSegments, minorSegments
 */
export interface GeometryParams {
  segX?: number;
  segY?: number;
  segZ?: number;
  latSegments?: number;
  lonSegments?: number;
  radialSegments?: number;
  heightSegments?: number;
  majorSegments?: number;
  minorSegments?: number;
}

/**
 * Тип физики объекта. 'none' — объект в симуляции не участвует.
 * Строковый union, а не enum движка (PhysicsType): shared/ не должен зависеть
 * от wgpu_utils (им пользуется и Express-сервер).
 */
export type SimPhysicsType = 'none' | 'static' | 'rigid' | 'cloth';

/**
 * Тип коллайдера. 'mesh' — треугольная сетка объекта; остальные —
 * аналитические (только для rigid, см. ColliderKind в analytic_collider.ts).
 */
export type SimColliderKind = 'mesh' | 'box' | 'sphere' | 'capsule' | 'cylinder';

/**
 * Коллайдер объекта. Размеры — в ЛОКАЛЬНОМ пространстве объекта БЕЗ учёта
 * scale (scale применяется при сборке сцены для солвера). При auto === true
 * поля размеров игнорируются и вычисляются по мешу (подгонка).
 */
export interface SimColliderSettings {
  kind: SimColliderKind;
  auto: boolean;
  /** Центр коллайдера в локальных координатах объекта. */
  center?: [number, number, number];
  /** box: полуразмеры по локальным осям X/Y/Z. */
  halfExtents?: [number, number, number];
  /** sphere/capsule/cylinder: радиус. */
  radius?: number;
  /** capsule/cylinder: полудлина (capsule — цилиндрической части без колпачков). */
  halfLength?: number;
  /** capsule/cylinder: ось, 0=X, 1=Y, 2=Z. */
  axis?: 0 | 1 | 2;
}

/** Параметры rigid-тела. */
export interface SimRigidSettings {
  /** Плотность, кг/м³ (масса = плотность × объём). */
  density: number;
  /** Явная масса, кг; переопределяет density (нужна для незамкнутых мешей). */
  mass?: number;
}

/** Параметры ткани (cloth). */
export interface SimClothSettings {
  materialProperties: PhysicsMaterialProperties;
  /** Закрепление вершин: нет / четыре угла плоскости. */
  pinned: 'none' | 'corners';
}

/** Настройки физики объекта (отсутствует = 'none'). */
export interface ObjectSim {
  physicsType: SimPhysicsType;
  collider: SimColliderSettings;
  rigid: SimRigidSettings;
  cloth: SimClothSettings;
}

/** Ссылка на OBJ-ассет, вшитый в сборку клиента (client/src/assets/assetLibrary.ts). */
export interface AssetMeshRef {
  /** Имя файла ассета, например 'Wooden table 2.obj'. */
  assetId: string;
}

/**
 * Данные объекта сцены
 */
export interface SceneObjectData {
  id: string;
  name: string;
  type: ObjectType;
  modelUrl?: string; // Для type === 'model'
  physicsMesh?: PhysicsMeshData; // Для type === 'physicsMesh'
  assetMesh?: AssetMeshRef; // Для type === 'assetMesh'
  /** Дискретизация примитива (box/sphere/cylinder/cone/plane/torus). */
  geometry?: GeometryParams;
  /** Физика объекта; не задано = 'none'. */
  sim?: ObjectSim;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  material: MaterialData;
  visible: boolean;
  locked: boolean;
}

/**
 * Данные камеры
 */
export interface CameraData {
  position: [number, number, number];
  target: [number, number, number];
}

/**
 * Окружение сцены
 */
export interface EnvironmentData {
  backgroundColor: string;
  ambientLightIntensity: number;
}

/**
 * Полные данные сцены
 */
export interface SceneData {
  camera: CameraData;
  environment: EnvironmentData;
  objects: SceneObjectData[];
}

/**
 * Метаданные сцены (для списка сцен)
 */
export interface SceneMetadata {
  id: string;
  name: string;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Полная сцена (метаданные + данные)
 */
export interface Scene extends SceneMetadata {
  data: SceneData;
}
