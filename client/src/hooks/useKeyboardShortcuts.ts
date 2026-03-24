/**
 * Хук для обработки горячих клавиш
 */

import { useEffect } from 'react';
import { useSceneStore } from '@/store/useSceneStore';

export function useKeyboardShortcuts() {
  const selectedId = useSceneStore((state) => state.selectedId);
  const removeObject = useSceneStore((state) => state.removeObject);
  const deselectAll = useSceneStore((state) => state.deselectAll);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Delete / Backspace - удалить выбранный объект
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        // Предотвращаем действие по умолчанию (навигацию назад для Backspace)
        event.preventDefault();
        removeObject(selectedId);
      }

      // Escape - снять выделение
      if (event.key === 'Escape' && selectedId) {
        event.preventDefault();
        deselectAll();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId, removeObject, deselectAll]);
}
