/**
 * Zustand Store для UI-состояния редактора
 * Хранит режим трансформации, настройки сетки и snap
 */

import { create } from 'zustand';

export type TransformMode = 'translate' | 'rotate' | 'scale';

/**
 * Режим редактора:
 *   'edit'     — обычное редактирование (гизмо активен), GPU-ресурсов
 *                симуляции нет (PhysicsSimController их уничтожил/ещё не
 *                создавал).
 *   'simulate' — идёт GPU-симуляция, каждый кадр шагает солвер.
 *   'paused'   — симуляция ЗАМОРОЖЕНА: GPU-ресурсы (Style3DSolverScene,
 *                GpuContext) НЕ уничтожены, PhysicsSimController просто не
 *                вызывает solver.step() каждый кадр. Геометрия остаётся в
 *                текущей (деформированной) позе. 'simulate' из 'paused' —
 *                это RESUME (тот же солвер продолжает с той же точки), а не
 *                пересоздание — отличие от 'edit' → 'simulate' (свежий старт).
 * Гизмо и большинство операций редактирования запрещены и в 'simulate', и в
 * 'paused' — во время паузы позиции объектов по-прежнему завязаны на
 * invTransform, вычисленный на старте симуляции; подвинуть объект во время
 * паузы означало бы рассинхронизировать локальный буфер с этой матрицей.
 * См. wiki/plans/3d_configurator_integration.md, Этап 7.
 */
export type SimMode = 'edit' | 'simulate' | 'paused';

interface EditorStore {
  // UI состояние
  transformMode: TransformMode;
  showGrid: boolean;
  snapToGrid: boolean;
  simMode: SimMode;

  // Действия
  setTransformMode: (mode: TransformMode) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  /** Свежий старт из 'edit' (PhysicsSimController пересоберёт SceneSimInput и создаст солвер). */
  startSimulation: () => void;
  /** Заморозить текущий солвер, ресурсы не трогаются. */
  pauseSimulation: () => void;
  /** Продолжить с той же точки (солвер и его состояние — те же, что были до паузы). */
  resumeSimulation: () => void;
  /** Полная остановка: PhysicsSimController уничтожит GPU-ресурсы и сбросит геометрию к rest-позе. */
  stopSimulation: () => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  // Начальное состояние
  transformMode: 'translate',
  showGrid: true,
  snapToGrid: false,
  simMode: 'edit',

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

  startSimulation: () => set({ simMode: 'simulate' }),
  pauseSimulation: () => set({ simMode: 'paused' }),
  resumeSimulation: () => set({ simMode: 'simulate' }),
  stopSimulation: () => set({ simMode: 'edit' }),
}));
