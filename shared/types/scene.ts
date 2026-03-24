/**
 * Типы объектов сцены
 */
export type ObjectType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'torus' | 'model';

/**
 * Материал объекта
 */
export interface MaterialData {
  color: string;
  metalness: number;
  roughness: number;
  textureUrl?: string;
}

/**
 * Данные объекта сцены
 */
export interface SceneObjectData {
  id: string;
  name: string;
  type: ObjectType;
  modelUrl?: string; // Для type === 'model'
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
