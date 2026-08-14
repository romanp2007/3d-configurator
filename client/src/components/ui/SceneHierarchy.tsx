/**
 * Scene Hierarchy - иерархический список объектов сцены
 * Отображает все объекты с иконками, индикаторами видимости и действиями
 */

import { useState } from 'react';
import { useSceneStore } from '@/store/useSceneStore';
import type { ObjectType } from '@shared/types/scene';

// Иконки для разных типов объектов
const objectIcons: Record<ObjectType, string> = {
  box: '◻',
  sphere: '○',
  cylinder: '▭',
  cone: '△',
  plane: '▬',
  torus: '◯',
  model: '▣',
  physicsMesh: '👕',
};

export function SceneHierarchy() {
  const objects = useSceneStore((state) => state.objects);
  const selectedId = useSceneStore((state) => state.selectedId);
  const selectObject = useSceneStore((state) => state.selectObject);
  const updateObject = useSceneStore((state) => state.updateObject);
  const removeObject = useSceneStore((state) => state.removeObject);
  const duplicateObject = useSceneStore((state) => state.duplicateObject);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleFinishEdit = (id: string) => {
    if (editingName.trim()) {
      updateObject(id, { name: editingName.trim() });
    }
    setEditingId(null);
  };

  const handleToggleVisibility = (id: string, currentVisible: boolean) => {
    updateObject(id, { visible: !currentVisible });
  };

  if (objects.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Иерархия сцены</h3>
        <p className="text-xs text-gray-400">Сцена пуста. Добавьте объекты из каталога выше.</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-2">Иерархия сцены ({objects.length})</h3>
      <div className="space-y-1">
        {objects.map((obj) => {
          const isSelected = obj.id === selectedId;
          const isEditing = editingId === obj.id;

          return (
            <div
              key={obj.id}
              className={`group flex items-center gap-2 p-2 rounded transition-colors ${
                isSelected ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {/* Иконка типа объекта */}
              <span className="text-lg flex-shrink-0">{objectIcons[obj.type]}</span>

              {/* Название объекта (инлайн редактирование) */}
              {isEditing ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={() => handleFinishEdit(obj.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleFinishEdit(obj.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 bg-gray-800 text-white px-2 py-1 rounded border border-blue-500 focus:outline-none text-sm"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => selectObject(obj.id)}
                  onDoubleClick={() => handleStartEdit(obj.id, obj.name)}
                  className="flex-1 text-left text-sm text-white truncate"
                  title={obj.name}
                >
                  {obj.name}
                </button>
              )}

              {/* Индикатор видимости */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleVisibility(obj.id, obj.visible);
                }}
                className={`flex-shrink-0 text-sm transition-opacity ${
                  obj.visible ? 'text-white opacity-100' : 'text-gray-500 opacity-50'
                }`}
                title={obj.visible ? 'Скрыть' : 'Показать'}
              >
                {obj.visible ? '👁' : '👁'}
              </button>

              {/* Кнопки действий (видны при hover) */}
              <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateObject(obj.id);
                  }}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                  title="Дублировать"
                >
                  📋
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeObject(obj.id);
                  }}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
