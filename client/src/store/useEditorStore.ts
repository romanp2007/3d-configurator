/**
 * Zustand Store для UI-состояния редактора
 * Хранит режим трансформации, настройки сетки и snap
 */

import { create } from 'zustand';

export type TransformMode = 'translate' | 'rotate' | 'scale';

interface EditorStore {
  // UI состояние
  transformMode: TransformMode;
  showGrid: boolean;
  snapToGrid: boolean;

  // Действия
  setTransformMode: (mode: TransformMode) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  // Начальное состояние
  transformMode: 'translate',
  showGrid: true,
  snapToGrid: false,

  // Установить режим трансформации
  setTransformMode: (mode) =>
    set(() => ({
      transformMode: mode,
    })),

  // Переключить видимость сетки
  toggleGrid: () =>
    set((state) => ({
      showGrid: !state.showGrid,
    })),

  // Переключить snap to grid
  toggleSnap: () =>
    set((state) => ({
      snapToGrid: !state.snapToGrid,
    })),
}));
