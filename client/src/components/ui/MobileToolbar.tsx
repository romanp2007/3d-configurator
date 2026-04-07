/**
 * Мобильная нижняя панель инструментов
 * Основные действия в виде иконок для тач-устройств
 */

import { useEditorStore, type TransformMode } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useSceneStore } from '@/store/useSceneStore';

interface MobileToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  onScreenshot: () => void;
  onToggleCatalog: () => void;
  onToggleProperties: () => void;
  catalogOpen: boolean;
  propertiesOpen: boolean;
}

export function MobileToolbar({
  onSave,
  onLoad,
  onScreenshot,
  onToggleCatalog,
  onToggleProperties,
  catalogOpen,
  propertiesOpen,
}: MobileToolbarProps) {
  const transformMode = useEditorStore((s) => s.transformMode);
  const setTransformMode = useEditorStore((s) => s.setTransformMode);
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const selectedId = useSceneStore((s) => s.selectedId);

  const modes: { mode: TransformMode; icon: string; label: string }[] = [
    { mode: 'translate', icon: '✥', label: 'Двигать' },
    { mode: 'rotate', icon: '↻', label: 'Вращать' },
    { mode: 'scale', icon: '⤡', label: 'Масштаб' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-gray-900/95 backdrop-blur-sm border-t border-gray-700">
      {/* Верхняя строка — трансформации (только при выделенном объекте) */}
      {selectedId && (
        <div className="flex border-b border-gray-800">
          {modes.map(({ mode, icon, label }) => (
            <button
              key={mode}
              onClick={() => setTransformMode(mode)}
              className={`flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors ${
                transformMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={label}
            >
              <span className="text-lg leading-none">{icon}</span>
              <span className="text-[10px]">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Нижняя строка — основные действия */}
      <div className="flex">
        {/* Каталог */}
        <button
          onClick={onToggleCatalog}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors ${
            catalogOpen ? 'text-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-xl leading-none">◻</span>
          <span className="text-[10px]">Объекты</span>
        </button>

        {/* Undo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex-1 py-3 flex flex-col items-center gap-0.5 disabled:text-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-xl leading-none">↶</span>
          <span className="text-[10px]">Отменить</span>
        </button>

        {/* Redo */}
        <button
          onClick={redo}
          disabled={!canRedo}
          className="flex-1 py-3 flex flex-col items-center gap-0.5 disabled:text-gray-700 text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-xl leading-none">↷</span>
          <span className="text-[10px]">Повтор</span>
        </button>

        {/* Скриншот */}
        <button
          onClick={onScreenshot}
          className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-xl leading-none">📷</span>
          <span className="text-[10px]">Снимок</span>
        </button>

        {/* Сохранить */}
        <button
          onClick={onSave}
          className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-xl leading-none">💾</span>
          <span className="text-[10px]">Сохранить</span>
        </button>

        {/* Загрузить */}
        <button
          onClick={onLoad}
          className="flex-1 py-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-white transition-colors"
        >
          <span className="text-xl leading-none">📂</span>
          <span className="text-[10px]">Открыть</span>
        </button>

        {/* Свойства */}
        <button
          onClick={onToggleProperties}
          disabled={!selectedId}
          className={`flex-1 py-3 flex flex-col items-center gap-0.5 disabled:text-gray-700 transition-colors ${
            propertiesOpen && selectedId ? 'text-blue-400' : 'text-gray-400 hover:text-white'
          }`}
        >
          <span className="text-xl leading-none">⚙</span>
          <span className="text-[10px]">Свойства</span>
        </button>
      </div>
    </div>
  );
}
