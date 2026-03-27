/**
 * Панель инструментов для управления режимами трансформации и историей
 */

import { useEditorStore, type TransformMode } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';

export function Toolbar() {
  const transformMode = useEditorStore((state) => state.transformMode);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);

  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  const modes: { mode: TransformMode; label: string; key: string }[] = [
    { mode: 'translate', label: 'Перемещение', key: 'W' },
    { mode: 'rotate', label: 'Вращение', key: 'E' },
    { mode: 'scale', label: 'Масштаб', key: 'R' },
  ];

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex gap-2 bg-gray-800/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-700">
        {/* Undo/Redo кнопки */}
        <button
          onClick={() => undo()}
          disabled={!canUndo}
          className={`px-3 py-2 rounded transition-colors ${
            canUndo
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          title="Отменить (Ctrl+Z)"
        >
          <span className="text-sm font-medium">↶ Undo</span>
        </button>

        <button
          onClick={() => redo()}
          disabled={!canRedo}
          className={`px-3 py-2 rounded transition-colors ${
            canRedo
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          title="Повторить (Ctrl+Shift+Z)"
        >
          <span className="text-sm font-medium">↷ Redo</span>
        </button>

        {/* Разделитель */}
        <div className="w-px bg-gray-600 mx-1"></div>

        {/* Режимы трансформации */}
        {modes.map(({ mode, label, key }) => (
          <button
            key={mode}
            onClick={() => setTransformMode(mode)}
            className={`px-4 py-2 rounded transition-colors ${
              transformMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={`${label} (${key})`}
          >
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs ml-2 opacity-70">{key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
