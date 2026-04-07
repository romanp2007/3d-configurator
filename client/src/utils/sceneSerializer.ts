/**
 * Конвертация между состоянием Zustand store и форматом API (SceneData)
 * Также: экспорт/импорт сцены как JSON-файл
 */

import type { SceneObjectData, SceneData } from '@shared/types/scene';

/** Дефолтные значения камеры и окружения */
const DEFAULT_SCENE_DATA: Omit<SceneData, 'objects'> = {
  camera: {
    position: [5, 5, 5],
    target: [0, 0, 0],
  },
  environment: {
    backgroundColor: '#1a1a2e',
    ambientLightIntensity: 0.5,
  },
};

/**
 * Store → SceneData для отправки на сервер
 */
export function serializeScene(objects: SceneObjectData[]): SceneData {
  return {
    ...DEFAULT_SCENE_DATA,
    objects,
  };
}

/**
 * SceneData (из API) → массив объектов для загрузки в store
 */
export function deserializeScene(data: SceneData): SceneObjectData[] {
  return data.objects;
}

/**
 * Скачать сцену как JSON-файл
 */
export function exportSceneToJson(objects: SceneObjectData[], filename = 'scene.json') {
  const data = serializeScene(objects);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Импортировать сцену из JSON-файла.
 * Возвращает Promise с массивом объектов или null при ошибке парсинга.
 */
export function importSceneFromJson(file: File): Promise<SceneObjectData[] | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as SceneData;
        if (!Array.isArray(data.objects)) {
          resolve(null);
          return;
        }
        resolve(data.objects);
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
