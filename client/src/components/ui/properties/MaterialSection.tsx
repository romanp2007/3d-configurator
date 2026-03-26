/**
 * Секция Material для редактирования материала объекта
 * Включает color picker и слайдеры для metalness/roughness
 */

import type { SceneObjectData } from '@shared/types/scene';

interface MaterialSectionProps {
  object: SceneObjectData;
  onUpdate: (id: string, updates: Partial<SceneObjectData>) => void;
}

export function MaterialSection({ object, onUpdate }: MaterialSectionProps) {
  const handleMaterialChange = (updates: Partial<typeof object.material>) => {
    onUpdate(object.id, {
      material: {
        ...object.material,
        ...updates,
      },
    });
  };

  return (
    <div className="mb-4 pb-4 border-b border-gray-700">
      <h3 className="text-white font-medium text-sm mb-3">Material</h3>

      {/* Color */}
      <div className="mb-3">
        <label className="block text-gray-400 text-xs mb-2">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={object.material.color}
            onChange={(e) => handleMaterialChange({ color: e.target.value })}
            className="w-12 h-8 rounded border border-gray-600 cursor-pointer bg-gray-700"
          />
          <input
            type="text"
            value={object.material.color}
            onChange={(e) => handleMaterialChange({ color: e.target.value })}
            className="flex-1 bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm font-mono"
            placeholder="#ffffff"
          />
        </div>
      </div>

      {/* Metalness */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Metalness</label>
          <span className="text-white text-xs">{object.material.metalness.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={object.material.metalness}
          onChange={(e) => handleMaterialChange({ metalness: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Roughness */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Roughness</label>
          <span className="text-white text-xs">{object.material.roughness.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={object.material.roughness}
          onChange={(e) => handleMaterialChange({ roughness: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>
    </div>
  );
}
