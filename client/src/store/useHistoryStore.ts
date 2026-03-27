/**
 * History Store для управления Undo/Redo
 * Использует zundo temporal middleware (встроен в useSceneStore)
 */

import { useSceneStore } from './useSceneStore';

// Хелпер хук для удобного использования undo/redo
export function useHistoryStore() {
  const undo = useSceneStore.temporal.getState().undo;
  const redo = useSceneStore.temporal.getState().redo;
  const pastStates = useSceneStore.temporal.getState().pastStates;
  const futureStates = useSceneStore.temporal.getState().futureStates;

  return {
    undo,
    redo,
    canUndo: pastStates.length > 0,
    canRedo: futureStates.length > 0,
  };
}
