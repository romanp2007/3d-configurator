/**
 * Хук для обработки горячих клавиш
 */

import { useEffect } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';

interface ShortcutCallbacks {
  onSave?: () => void;
  onLoad?: () => void;
}

export function useKeyboardShortcuts({ onSave, onLoad }: ShortcutCallbacks = {}) {
  const selectedId = useSceneStore((state) => state.selectedId);
  const removeObject = useSceneStore((state) => state.removeObject);
  const deselectAll = useSceneStore((state) => state.deselectAll);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);
  const { undo, redo } = useHistoryStore();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl+S - Сохранить
      if (event.ctrlKey && event.key === 's' && !event.shiftKey) {
        event.preventDefault();
        onSave?.();
        return;
      }

      // Ctrl+O - Открыть
      if (event.ctrlKey && event.key === 'o') {
        event.preventDefault();
        onLoad?.();
        return;
      }

      // Ctrl+Z - Undo
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z - Redo
      if (event.ctrlKey && event.shiftKey && event.key === 'Z') {
        event.preventDefault();
        redo();
        return;
      }
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
  }, [selectedId, removeObject, deselectAll, setTransformMode, undo, redo, onSave, onLoad]);
}
