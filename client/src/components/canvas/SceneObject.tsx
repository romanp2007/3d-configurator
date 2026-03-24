/**
 * Компонент объекта сцены
 * Рендерит меш по типу объекта (box/sphere/cylinder и т.д.)
 * Поддерживает выделение и визуальную подсветку
 */

import type { SceneObjectData } from '@shared/types/scene';
import { ThreeEvent } from '@react-three/fiber';

interface SceneObjectProps {
  data: SceneObjectData;
  isSelected: boolean;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}

export function SceneObject({ data, isSelected, onClick }: SceneObjectProps) {
  const { position, rotation, scale, material, type, visible } = data;

  // Если объект скрыт, не рендерим
  if (!visible) return null;

  // Цвет для выделенного объекта (более яркий)
  const emissive = isSelected ? '#ff6b00' : '#000000';
  const emissiveIntensity = isSelected ? 0.3 : 0;

  // Общие props для всех мешей
  const meshProps = {
    position,
    rotation,
    scale,
    castShadow: true,
    receiveShadow: true,
    onClick,
  };

  // Общие props для материала
  const materialProps = {
    color: material.color,
    metalness: material.metalness,
    roughness: material.roughness,
    emissive,
    emissiveIntensity,
  };

  // Рендер геометрии в зависимости от типа
  switch (type) {
    case 'box':
      return (
        <mesh {...meshProps}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );

    case 'sphere':
      return (
        <mesh {...meshProps}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );

    case 'cylinder':
      return (
        <mesh {...meshProps}>
          <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );

    case 'cone':
      return (
        <mesh {...meshProps}>
          <coneGeometry args={[0.5, 1, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );

    case 'plane':
      return (
        <mesh {...meshProps}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial {...materialProps} side={2} />
        </mesh>
      );

    case 'torus':
      return (
        <mesh {...meshProps}>
          <torusGeometry args={[0.5, 0.2, 16, 32]} />
          <meshStandardMaterial {...materialProps} />
        </mesh>
      );

    case 'model':
      // TODO: Загрузка GLTF моделей будет реализована на следующих этапах
      return (
        <mesh {...meshProps}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial {...materialProps} wireframe />
        </mesh>
      );

    default:
      return null;
  }
}
