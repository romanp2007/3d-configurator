/**
 * Панель инструментов для управления режимами трансформации
 */

import { useEditorStore, type TransformMode } from '@/store/useEditorStore';

export function Toolbar() {
  const transformMode = useEditorStore((state) => state.transformMode);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);

  const modes: { mode: TransformMode; label: string; key: string }[] = [
    { mode: 'translate', label: 'Перемещение', key: 'W' },
    { mode: 'rotate', label: 'Вращение', key: 'E' },
    { mode: 'scale', label: 'Масштаб', key: 'R' },
  ];

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex gap-2 bg-gray-800/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-700">
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
