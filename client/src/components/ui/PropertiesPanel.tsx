/**
 * Панель свойств выбранного объекта
 * Отображает секции для редактирования transform, material и других параметров
 */

import { useSceneStore } from '@/store/useSceneStore';
import { TransformSection } from './properties/TransformSection';
import { MaterialSection } from './properties/MaterialSection';

export function PropertiesPanel() {
  const selectedId = useSceneStore((state) => state.selectedId);
  const objects = useSceneStore((state) => state.objects);
  const updateObject = useSceneStore((state) => state.updateObject);

  const selectedObject = selectedId ? objects.find((obj) => obj.id === selectedId) : null;

  if (!selectedObject) {
    return (
      <aside className="w-80 bg-gray-800 p-4 flex flex-col border-l border-gray-700">
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Выберите объект для редактирования
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-80 bg-gray-800 p-4 flex flex-col border-l border-gray-700 overflow-y-auto">
      {/* Заголовок панели */}
      <div className="mb-4">
        <h2 className="text-white font-semibold text-lg mb-2">Свойства объекта</h2>

        {/* Имя объекта */}
        <div className="mb-3">
          <label className="block text-gray-400 text-xs mb-1">Имя</label>
          <input
            type="text"
            value={selectedObject.name}
            onChange={(e) => updateObject(selectedObject.id, { name: e.target.value })}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          />
        </div>

        {/* Чекбокс видимости */}
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedObject.visible}
            onChange={(e) => updateObject(selectedObject.id, { visible: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
          />
          <span>Visible</span>
        </label>
      </div>

      {/* Transform Section */}
      <TransformSection object={selectedObject} onUpdate={updateObject} />

      {/* Material Section */}
      <MaterialSection object={selectedObject} onUpdate={updateObject} />
    </aside>
  );
}
