/**
 * Каталог объектов с drag & drop
 * Отображает доступные примитивы для добавления на сцену
 */

import { useDrag } from 'react-dnd';
import type { ObjectType } from '@shared/types/scene';

interface CatalogItem {
  type: ObjectType;
  label: string;
  icon: string;
}

const catalogItems: CatalogItem[] = [
  { type: 'box', label: 'Куб', icon: '◻' },
  { type: 'sphere', label: 'Сфера', icon: '○' },
  { type: 'cylinder', label: 'Цилиндр', icon: '▭' },
  { type: 'cone', label: 'Конус', icon: '△' },
  { type: 'plane', label: 'Плоскость', icon: '▬' },
  { type: 'torus', label: 'Тор', icon: '◯' },
];

interface DraggableItemProps {
  item: CatalogItem;
}

/**
 * Элемент каталога с drag функциональностью
 */
function DraggableItem({ item }: DraggableItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'SCENE_OBJECT',
    item: { objectType: item.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-move text-center transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      <div className="text-3xl mb-1">{item.icon}</div>
      <div className="text-xs text-gray-300">{item.label}</div>
    </div>
  );
}

/**
 * Компонент каталога объектов
 */
export function ObjectCatalog() {
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Каталог объектов</h3>
      <div className="grid grid-cols-2 gap-2">
        {catalogItems.map((item) => (
          <DraggableItem key={item.type} item={item} />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">Перетащите объект на сцену</p>
    </div>
  );
}
