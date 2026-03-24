/**
 * Drop target для canvas
 * Принимает объекты из каталога и добавляет их на сцену
 */

import { useDrop } from 'react-dnd';
import { useSceneStore } from '@/store/useSceneStore';
import type { ObjectType } from '@shared/types/scene';

interface DropItem {
  objectType: ObjectType;
}

/**
 * Компонент-заглушка для CanvasDropZone
 * Реальная логика drop находится в CanvasDropTarget (DOM wrapper)
 */
export function CanvasDropZone() {
  return null;
}

interface CanvasDropTargetProps {
  children: React.ReactNode;
}

/**
 * Обёртка для canvas, принимающая drag & drop
 */
export function CanvasDropTarget({ children }: CanvasDropTargetProps) {
  const addObject = useSceneStore((state) => state.addObject);

  const [{ isOver }, drop] = useDrop({
    accept: 'SCENE_OBJECT',
    drop: (item: DropItem) => {
      // Пока добавляем объект с рандомной позицией рядом с центром
      // Полноценный raycasting будет на следующих этапах
      const randomX = (Math.random() - 0.5) * 6;
      const randomZ = (Math.random() - 0.5) * 6;
      const newId = addObject(item.objectType);

      // Обновляем позицию объекта
      useSceneStore.getState().updateObject(newId, {
        position: [randomX, 0.5, randomZ],
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`flex-1 relative transition-colors ${isOver ? 'bg-blue-900/20' : ''}`}
    >
      {children}
    </div>
  );
}
