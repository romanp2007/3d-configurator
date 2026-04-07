/**
 * Панель инструментов для управления режимами трансформации и историей
 */

import { useRef } from 'react';
import { useEditorStore, type TransformMode } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';

interface ToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  onScreenshot: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onHotkeys: () => void;
}

export function Toolbar({ onSave, onLoad, onScreenshot, onExportJson, onImportJson, onHotkeys }: ToolbarProps) {
  const transformMode = useEditorStore((state) => state.transformMode);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        <div className="w-px bg-gray-600 mx-1" />

        {/* Save / Load */}
        <button
          onClick={onSave}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Сохранить сцену (Ctrl+S)"
        >
          <span className="text-sm font-medium">💾 Сохранить</span>
        </button>
        <button
          onClick={onLoad}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Загрузить сцену (Ctrl+O)"
        >
          <span className="text-sm font-medium">📂 Загрузить</span>
        </button>

        {/* Разделитель */}
        <div className="w-px bg-gray-600 mx-1" />

        {/* Screenshot */}
        <button
          onClick={onScreenshot}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Скриншот сцены"
        >
          <span className="text-sm font-medium">📷</span>
        </button>

        {/* Экспорт JSON */}
        <button
          onClick={onExportJson}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Экспорт сцены в JSON"
        >
          <span className="text-sm font-medium">⬇ JSON</span>
        </button>

        {/* Импорт JSON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Импорт сцены из JSON"
        >
          <span className="text-sm font-medium">⬆ JSON</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportJson(file);
            // Сбросить value чтобы можно было загрузить тот же файл повторно
            e.target.value = '';
          }}
        />

        {/* Справка */}
        <button
          onClick={onHotkeys}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Горячие клавиши (F1)"
        >
          <span className="text-sm font-medium">?</span>
        </button>

        {/* Разделитель */}
        <div className="w-px bg-gray-600 mx-1" />

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
