/**
 * Компонент объекта сцены
 * Рендерит меш по типу объекта (box/sphere/cylinder и т.д.)
 * Поддерживает выделение, визуальную подсветку и текстуры
 */

import { useMemo, useEffect, useRef, Suspense } from 'react';
import { useTexture, useGLTF } from '@react-three/drei';
import type { SceneObjectData } from '@shared/types/scene';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  registerPhysicsGeometry,
  unregisterPhysicsGeometry,
  registerPhysicsObject3D,
  unregisterPhysicsObject3D,
} from '@/physics/physicsGeometryRegistry';
import { buildPrimitiveMesh, isPrimitiveType, resolveGeometryParams, type PrimitiveType } from '@/physics/primitiveMesh';
import { useAssetMesh } from '@/hooks/useAssetMesh';
import { useEditorStore } from '@/store/useEditorStore';
import { getCollisionMesh, getSim, scaledCollider } from '@/physics/objectPhysics';

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

// --- Примитивы с настраиваемой дискретизацией ---

/** Угол сглаживания нормалей: рёбра острее — остаются гранями (куб — плоский, сфера — гладкая). */
const CREASE_ANGLE = 0.5; // рад ≈ 28.6°

/** Регистрирует Object3D меша в реестре симуляции (rigid-тела двигаются через него). */
function useRegisterObject3D(id: string, ref: React.RefObject<THREE.Object3D | null>, ready = true) {
  useEffect(() => {
    const obj = ref.current;
    if (!obj || !ready) return;
    registerPhysicsObject3D(id, obj);
    return () => unregisterPhysicsObject3D(id, obj);
  }, [id, ref, ready]);
}

interface GeometryMeshObjectProps {
  data: SceneObjectData;
  meshProps: object;
  materialProps: Omit<MaterialProps, 'textureUrl'> & { textureUrl?: string };
}

/**
 * Примитив (куб/сфера/цилиндр/конус/плоскость/тор) — геометрия из того же
 * buildPrimitiveMesh, что использует и физика. Плоскость-ткань (sim.physicsType
 * === 'cloth') рендерится ИНДЕКСИРОВАННОЙ геометрией с DynamicDrawUsage и
 * регистрируется в реестре: симуляция перезаписывает position-атрибут
 * (vertex-морфинг, как у physicsMesh). Остальное — неизменяемая геометрия со
 * сглаженными по углу нормалями.
 */
function PrimitiveMeshObject({ data, meshProps, materialProps }: GeometryMeshObjectProps) {
  const type = data.type as PrimitiveType; // вызывается SceneObject только для примитивов
  const isClothPlane = type === 'plane' && data.sim?.physicsType === 'cloth';
  const paramsKey = JSON.stringify(resolveGeometryParams(type, data.geometry));
  const meshRef = useRef<THREE.Mesh>(null);
  useRegisterObject3D(data.id, meshRef);

  const geometry = useMemo(() => {
    const mesh = buildPrimitiveMesh(type, JSON.parse(paramsKey));
    const geom = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(mesh.vertices.slice(), 3);
    geom.setAttribute('position', positionAttr);
    geom.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    if (isClothPlane) {
      positionAttr.setUsage(THREE.DynamicDrawUsage);
      geom.computeVertexNormals();
      return geom;
    }
    const creased = toCreasedNormals(geom, CREASE_ANGLE);
    geom.dispose();
    return creased;
  }, [type, paramsKey, isClothPlane]);

  useEffect(() => {
    if (!isClothPlane) return;
    registerPhysicsGeometry(data.id, geometry);
    return () => unregisterPhysicsGeometry(data.id, geometry);
  }, [data.id, geometry, isClothPlane]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const side = type === 'plane' ? THREE.DoubleSide : undefined;
  return (
    <mesh {...meshProps} ref={meshRef} geometry={geometry}>
      <ObjectMaterial {...materialProps} side={side} />
    </mesh>
  );
}

/** Меш из ассета (OBJ, assets/assetLibrary.ts): ждёт загрузки чанка, затем рисует несклеенный меш. */
function AssetMeshObject({ data, meshProps, materialProps }: GeometryMeshObjectProps) {
  const { mesh } = useAssetMesh(data.assetMesh?.assetId);
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    if (!mesh) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(mesh.render.vertices, 3));
    geom.setIndex(new THREE.BufferAttribute(mesh.render.indices, 1));
    geom.computeVertexNormals();
    return geom;
  }, [mesh]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  // Меш появляется только после загрузки чанка ассета — регистрируем, когда он уже в сцене.
  useRegisterObject3D(data.id, meshRef, !!geometry);

  if (!geometry) return null;
  return (
    <mesh {...meshProps} ref={meshRef} geometry={geometry}>
      <ObjectMaterial {...materialProps} side={THREE.DoubleSide} />
    </mesh>
  );
}

// --- Основной компонент ---

function SceneObjectMesh({ data, isSelected, onClick }: SceneObjectProps) {
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

  if (type === 'assetMesh') {
    return <AssetMeshObject data={data} meshProps={meshProps} materialProps={materialProps} />;
  }

  if (isPrimitiveType(type)) {
    return <PrimitiveMeshObject data={data} meshProps={meshProps} materialProps={materialProps} />;
  }

  return null;
}

// --- Оверлей аналитического коллайдера ---

/**
 * Каркас аналитического коллайдера rigid-тела (box/сфера/капсула/цилиндр) поверх
 * меша — показывает, что на самом деле столкнётся в симуляции. Размеры и центр —
 * те же, что у билдера сцены (scaledCollider). Только в режиме редактирования.
 */
function ColliderOverlay({ data }: { data: SceneObjectData }) {
  const mesh = getCollisionMesh(data);
  if (!mesh) return null;
  const sc = scaledCollider(data, mesh);
  if (!sc) return null;

  const s = data.scale;
  const pos: [number, number, number] = [sc.center[0] * s[0], sc.center[1] * s[1], sc.center[2] * s[2]];
  // Геометрии three — с осью Y; поворачиваем под ось коллайдера.
  const axisRot: [number, number, number] = sc.axis === 0 ? [0, 0, Math.PI / 2] : sc.axis === 2 ? [Math.PI / 2, 0, 0] : [0, 0, 0];

  let geometry: React.ReactNode;
  switch (sc.kind) {
    case 'box':
      geometry = <boxGeometry args={[sc.halfExtents![0] * 2, sc.halfExtents![1] * 2, sc.halfExtents![2] * 2]} />;
      break;
    case 'sphere':
      geometry = <sphereGeometry args={[sc.radius!, 24, 16]} />;
      break;
    case 'cylinder':
      geometry = <cylinderGeometry args={[sc.radius!, sc.radius!, sc.halfLength! * 2, 24]} />;
      break;
    case 'capsule':
      geometry = <capsuleGeometry args={[sc.radius!, sc.halfLength! * 2, 6, 24]} />;
      break;
  }

  return (
    <group position={data.position} rotation={data.rotation}>
      <mesh position={pos} rotation={sc.kind === 'box' || sc.kind === 'sphere' ? [0, 0, 0] : axisRot}>
        {geometry}
        <meshBasicMaterial color="#22ff88" wireframe depthTest={false} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export function SceneObject(props: SceneObjectProps) {
  const { data } = props;
  const simMode = useEditorStore((s) => s.simMode);
  const showCollider =
    simMode === 'edit' && data.visible && !!data.sim && getSim(data).physicsType === 'rigid' && getSim(data).collider.kind !== 'mesh';
  return (
    <>
      <SceneObjectMesh {...props} />
      {showCollider && <ColliderOverlay data={data} />}
    </>
  );
}
