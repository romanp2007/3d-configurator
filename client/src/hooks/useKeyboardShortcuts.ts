/**
 * Хук для обработки горячих клавиш
 */

import { useEffect } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { useEditorStore } from '@/store/useEditorStore';

export function useKeyboardShortcuts() {
  const selectedId = useSceneStore((state) => state.selectedId);
  const removeObject = useSceneStore((state) => state.removeObject);
  const deselectAll = useSceneStore((state) => state.deselectAll);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);

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

      // W - режим перемещения
      if (event.key === 'w' || event.key === 'W') {
        event.preventDefault();
        setTransformMode('translate');
      }

      // E - режим вращения
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        setTransformMode('rotate');
      }

      // R - режим масштабирования
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        setTransformMode('scale');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedId, removeObject, deselectAll, setTransformMode]);
}
