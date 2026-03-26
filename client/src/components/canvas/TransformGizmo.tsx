/**
 * Transform Gizmo для манипуляции объектами
 * Обёртка над TransformControls из drei
 */

import { useRef, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import { useSceneStore } from '@/store/useSceneStore';
import { useEditorStore } from '@/store/useEditorStore';
import { SceneObject } from './SceneObject';

interface TransformGizmoProps {
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function TransformGizmo({ onDragStart, onDragEnd }: TransformGizmoProps) {
  const selectedId = useSceneStore((state) => state.selectedId);
  const objects = useSceneStore((state) => state.objects);
  const updateObject = useSceneStore((state) => state.updateObject);
  const transformMode = useEditorStore((state) => state.transformMode);
  const controlsRef = useRef<any>(null);

  const selectedObject = selectedId ? objects.find((obj) => obj.id === selectedId) : null;

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleMouseDown = () => {
      onDragStart?.();
    };

    const handleMouseUp = () => {
      onDragEnd?.();

      // Синхронизируем финальную позицию с store
      if (!selectedId) return;
      const object = controls.object;
      if (!object) return;

      updateObject(selectedId, {
        position: [object.position.x, object.position.y, object.position.z],
        rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
        scale: [object.scale.x, object.scale.y, object.scale.z],
      });
    };

    controls.addEventListener('mouseDown', handleMouseDown);
    controls.addEventListener('mouseUp', handleMouseUp);

    return () => {
      controls.removeEventListener('mouseDown', handleMouseDown);
      controls.removeEventListener('mouseUp', handleMouseUp);
    };
  }, [selectedId, updateObject, onDragStart, onDragEnd]);

  if (!selectedObject) return null;

  return (
    <TransformControls
      ref={controlsRef}
      mode={transformMode}
      position={selectedObject.position}
      rotation={selectedObject.rotation}
      scale={selectedObject.scale}
    >
      <SceneObject
        data={{
          ...selectedObject,
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        }}
        isSelected={true}
        onClick={() => {}}
      />
    </TransformControls>
  );
}
