/**
 * Компонент объекта сцены
 * Рендерит меш по типу объекта (box/sphere/cylinder и т.д.)
 * Поддерживает выделение, визуальную подсветку и текстуры
 */

import { useMemo, useEffect, Suspense } from 'react';
import { useTexture, useGLTF } from '@react-three/drei';
import type { SceneObjectData } from '@shared/types/scene';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { registerPhysicsGeometry, unregisterPhysicsGeometry } from '@/physics/physicsGeometryRegistry';

interface SceneObjectProps {
  data: SceneObjectData;
  isSelected: boolean;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}

// --- Материал с опциональной текстурой ---

interface MaterialProps {
  color: string;
  metalness: number;
  roughness: number;
  textureUrl?: string;
  emissive: string;
  emissiveIntensity: number;
  side?: THREE.Side;
  wireframe?: boolean;
}

function TexturedMaterial({ color, metalness, roughness, textureUrl, emissive, emissiveIntensity, side, wireframe }: MaterialProps) {
  const texture = useTexture(textureUrl!);

  // Настройка повтора текстуры
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <meshStandardMaterial
      color={color}
      metalness={metalness}
      roughness={roughness}
      map={texture}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
      side={side}
      wireframe={wireframe}
    />
  );
}

function ObjectMaterial(props: MaterialProps) {
  const base = {
    color: props.color,
    metalness: props.metalness,
    roughness: props.roughness,
    emissive: props.emissive,
    emissiveIntensity: props.emissiveIntensity,
    side: props.side,
    wireframe: props.wireframe,
  };

  if (props.textureUrl) {
    return (
      <Suspense fallback={<meshStandardMaterial {...base} />}>
        <TexturedMaterial {...props} />
      </Suspense>
    );
  }

  return <meshStandardMaterial {...base} />;
}

// --- GLB-модель ---

interface GltfModelProps {
  url: string;
  meshProps: object;
  materialProps: Omit<MaterialProps, 'textureUrl'>;
}

function GltfModel({ url, meshProps, materialProps }: GltfModelProps) {
  const { scene } = useGLTF(url);

  // Клонируем сцену чтобы не мутировать кэш useGLTF
  const cloned = useMemo(() => {
    const clone = scene.clone();
    // Применяем выделение через emissive и wireframe на все меши модели
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.emissive = new THREE.Color(materialProps.emissive);
        mat.emissiveIntensity = materialProps.emissiveIntensity;
        mat.wireframe = materialProps.wireframe ?? false;
        mesh.material = mat;
      }
    });
    return clone;
  }, [scene, materialProps.emissive, materialProps.emissiveIntensity, materialProps.wireframe]);

  return <primitive object={cloned} {...meshProps} />;
}

// --- physicsMesh (импортированная деталь newton/user_geometry) ---

interface PhysicsMeshObjectProps {
  id: string;
  positions: Float32Array;
  indices: Uint32Array;
  meshProps: object;
  materialProps: Omit<MaterialProps, 'textureUrl'>;
}

/**
 * Рендер импортированной физ-детали. Геометрия — ЛОКАЛЬНОЕ (rest) пространство
 * (positions/indices из vertices.bin/indices.bin, Z-up→Y-up уже применён при
 * импорте, см. physicsSceneApi.ts) — мировой transform накладывается через
 * обычные position/rotation/scale в meshProps, как для type === 'model'.
 * Тот же BufferGeometry служит vertex-морфером во время симуляции
 * (PhysicsSimController перезаписывает position-атрибут через
 * ExtractPhysicsPositionsKernel), см. wiki/plans/3d_configurator_integration.md,
 * Этап 3/7.
 */
function PhysicsMeshObject({ id, positions, indices, meshProps, materialProps }: PhysicsMeshObjectProps) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    // slice() — симуляция мутирует position.array в живом БУФЕРЕ; исходный
    // Float32Array в physicsMesh.positions должен остаться нетронутым (Reset).
    const positionAttr = new THREE.BufferAttribute(positions.slice(), 3);
    // DynamicDrawUsage — атрибут обновляется каждый физический кадр в
    // sim-режиме (PhysicsSimController), не только на создании.
    positionAttr.setUsage(THREE.DynamicDrawUsage);
    geom.setAttribute('position', positionAttr);
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    geom.computeVertexNormals();
    return geom;
  }, [positions, indices]);

  useEffect(() => {
    registerPhysicsGeometry(id, geometry);
    return () => unregisterPhysicsGeometry(id, geometry);
  }, [id, geometry]);

  return (
    <mesh {...meshProps} geometry={geometry}>
      <ObjectMaterial {...materialProps} side={THREE.DoubleSide} />
    </mesh>
  );
}

// --- Основной компонент ---

export function SceneObject({ data, isSelected, onClick }: SceneObjectProps) {
  const { position, rotation, scale, material, type, visible, modelUrl } = data;

  if (!visible) return null;

  const emissive = isSelected ? '#ff6b00' : '#000000';
  const emissiveIntensity = isSelected ? 0.3 : 0;

  const meshProps = {
    position,
    rotation,
    scale,
    castShadow: true,
    receiveShadow: true,
    onClick,
  };

  const materialProps: MaterialProps = {
    color: material.color,
    metalness: material.metalness,
    roughness: material.roughness,
    textureUrl: material.textureUrl,
    emissive,
    emissiveIntensity,
    wireframe: material.wireframe,
  };

  if (type === 'model') {
    if (!modelUrl) {
      // Заглушка пока модель не выбрана
      return (
        <mesh {...meshProps}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={material.color} wireframe emissive={emissive} emissiveIntensity={emissiveIntensity} />
        </mesh>
      );
    }
    return (
      <Suspense fallback={
        <mesh {...meshProps}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#888888" wireframe />
        </mesh>
      }>
        <GltfModel url={modelUrl} meshProps={meshProps} materialProps={materialProps} />
      </Suspense>
    );
  }

  if (type === 'physicsMesh') {
    if (!data.physicsMesh) return null; // защитно — не должно случаться (см. usePhysicsSceneApi)
    return (
      <PhysicsMeshObject
        id={data.id}
        positions={data.physicsMesh.positions}
        indices={data.physicsMesh.indices}
        meshProps={meshProps}
        materialProps={materialProps}
      />
    );
  }

  switch (type) {
    case 'box':
      return (
        <mesh {...meshProps}>
          <boxGeometry args={[1, 1, 1]} />
          <ObjectMaterial {...materialProps} />
        </mesh>
      );

    case 'sphere':
      return (
        <mesh {...meshProps}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <ObjectMaterial {...materialProps} />
        </mesh>
      );

    case 'cylinder':
      return (
        <mesh {...meshProps}>
          <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          <ObjectMaterial {...materialProps} />
        </mesh>
      );

    case 'cone':
      return (
        <mesh {...meshProps}>
          <coneGeometry args={[0.5, 1, 32]} />
          <ObjectMaterial {...materialProps} />
        </mesh>
      );

    case 'plane':
      return (
        <mesh {...meshProps}>
          <planeGeometry args={[1, 1]} />
          <ObjectMaterial {...materialProps} side={THREE.DoubleSide} />
        </mesh>
      );

    case 'torus':
      return (
        <mesh {...meshProps}>
          <torusGeometry args={[0.5, 0.2, 16, 32]} />
          <ObjectMaterial {...materialProps} />
        </mesh>
      );

    default:
      return null;
  }
}
