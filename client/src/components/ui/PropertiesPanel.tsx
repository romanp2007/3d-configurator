/**
 * Панель свойств выбранного объекта
 * Отображает секции для редактирования transform, material и других параметров
 *
 * bare=true — без обёртки <aside>, для встраивания в bottom sheet на мобильных
 */

import { useSceneStore } from '@/store/useSceneStore';
import { TransformSection } from './properties/TransformSection';
import { MaterialSection } from './properties/MaterialSection';
import { PhysicsSection } from './properties/PhysicsSection';

interface PropertiesPanelProps {
  /** Без внешней <aside>-обёртки — для bottom sheet на мобильных */
  bare?: boolean;
}

function PanelContent() {
  const selectedId = useSceneStore((state) => state.selectedId);
  const objects = useSceneStore((state) => state.objects);
  const updateObject = useSceneStore((state) => state.updateObject);

  const selectedObject = selectedId ? objects.find((obj) => obj.id === selectedId) : null;

  if (!selectedObject) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm p-8">
        Выберите объект для редактирования
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Имя объекта */}
      <h2 className="text-white font-semibold text-lg mb-3">Свойства объекта</h2>

      <div className="mb-4">
        <label className="block text-gray-400 text-xs mb-1">Имя</label>
        <input
          type="text"
          value={selectedObject.name}
          onChange={(e) => updateObject(selectedObject.id, { name: e.target.value })}
          className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer mb-4">
        <input
          type="checkbox"
          checked={selectedObject.visible}
          onChange={(e) => updateObject(selectedObject.id, { visible: e.target.checked })}
          className="w-4 h-4 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
        />
        <span>Visible</span>
      </label>

      <TransformSection object={selectedObject} onUpdate={updateObject} />
      {selectedObject.type === 'physicsMesh' && (
        <PhysicsSection object={selectedObject} onUpdate={updateObject} />
      )}
      <MaterialSection object={selectedObject} onUpdate={updateObject} />
    </div>
  );
}

export function PropertiesPanel({ bare = false }: PropertiesPanelProps) {
  if (bare) {
    return <PanelContent />;
  }

  return (
    <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col overflow-y-auto">
      <PanelContent />
    </aside>
  );
}
