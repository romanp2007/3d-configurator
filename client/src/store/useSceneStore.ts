/**
 * Zustand Store для управления состоянием сцены
 * Хранит объекты сцены, выделение, CRUD операции
 */

import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { SceneObjectData, ObjectType } from '@shared/types/scene';

interface SceneStore {
  // Состояние
  objects: SceneObjectData[];
  selectedId: string | null;

  // CRUD операции
  addObject: (type: ObjectType) => string; // Возвращает ID созданного объекта
  removeObject: (id: string) => void;
  updateObject: (id: string, patch: Partial<SceneObjectData>) => void;

  // Выделение
  selectObject: (id: string) => void;
  deselectAll: () => void;
}

/**
 * Создает объект с дефолтными значениями
 */
function createDefaultObject(type: ObjectType): SceneObjectData {
  const objectNames: Record<ObjectType, string> = {
    box: 'Куб',
    sphere: 'Сфера',
    cylinder: 'Цилиндр',
    cone: 'Конус',
    plane: 'Плоскость',
    torus: 'Тор',
    model: 'Модель',
  };

  return {
    id: nanoid(),
    name: objectNames[type],
    type,
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    material: {
      color: '#4a9eff',
      metalness: 0.3,
      roughness: 0.7,
    },
    visible: true,
    locked: false,
  };
}

export const useSceneStore = create<SceneStore>((set) => ({
  // Начальное состояние
  objects: [],
  selectedId: null,

  // Добавить объект
  addObject: (type) => {
    const newObject = createDefaultObject(type);
    set((state) => ({
      objects: [...state.objects, newObject],
    }));
    return newObject.id;
  },

  // Удалить объект
  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  // Обновить объект (partial update)
  updateObject: (id, patch) =>
    set((state) => ({
      objects: state.objects.map((obj) => (obj.id === id ? { ...obj, ...patch } : obj)),
    })),

  // Выделить объект
  selectObject: (id) =>
    set(() => ({
      selectedId: id,
    })),

  // Снять выделение
  deselectAll: () =>
    set(() => ({
      selectedId: null,
    })),
}));
