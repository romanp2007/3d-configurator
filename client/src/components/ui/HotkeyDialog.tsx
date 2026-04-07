/**
 * Диалог со справкой по горячим клавишам
 * Открывается кнопкой «?» в Toolbar или клавишей F1
 */

import { useEffect } from 'react';

interface HotkeyDialogProps {
  onClose: () => void;
}

const HOTKEYS = [
  { group: 'Камера', items: [
    { keys: 'ЛКМ + drag', description: 'Вращение камеры' },
    { keys: 'ПКМ + drag', description: 'Панорама' },
    { keys: 'Колесо мыши', description: 'Zoom' },
  ]},
  { group: 'Выделение', items: [
    { keys: 'ЛКМ по объекту', description: 'Выделить объект' },
    { keys: 'Escape', description: 'Снять выделение' },
    { keys: 'Delete / Backspace', description: 'Удалить выделенный объект' },
  ]},
  { group: 'Трансформация', items: [
    { keys: 'W', description: 'Режим перемещения' },
    { keys: 'E', description: 'Режим вращения' },
    { keys: 'R', description: 'Режим масштабирования' },
  ]},
  { group: 'История', items: [
    { keys: 'Ctrl + Z', description: 'Отменить' },
    { keys: 'Ctrl + Shift + Z', description: 'Повторить' },
  ]},
  { group: 'Файл', items: [
    { keys: 'Ctrl + S', description: 'Сохранить сцену' },
    { keys: 'Ctrl + O', description: 'Открыть сцену' },
  ]},
];

export function HotkeyDialog({ onClose }: HotkeyDialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F1') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Горячие клавиши</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {HOTKEYS.map(({ group, items }) => (
            <div key={group}>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">{group}</div>
              <div className="space-y-1">
                {items.map(({ keys, description }) => (
                  <div key={keys} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{description}</span>
                    <kbd className="px-2 py-0.5 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 font-mono whitespace-nowrap">
                      {keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-gray-700 text-center text-xs text-gray-500">
          Нажмите Escape или F1 для закрытия
        </div>
      </div>
    </div>
  );
}
