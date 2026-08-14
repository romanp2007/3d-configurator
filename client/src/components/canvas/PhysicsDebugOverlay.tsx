/**
 * Просмотр (read-only) швов и закреплённых вершин physicsMesh-объектов —
 * Этап 4b плана 3d_configurator_integration.md. Живёт внутри <Canvas>,
 * включается чекбоксами в PhysicsSection (usePhysicsDebugStore).
 *
 * НЕ реагирует на живую деформацию во время симуляции (PhysicsSimController
 * пишет прямо в геометрию, мимо useSceneStore) — оверлей показывает позиции
 * из редакторского состояния (rest-поза + текущий transform), это осознанно:
 * пересчёт каждый физический кадр был бы лишней нагрузкой ради
 * структурного/топологического вида, не предназначенного быть live-viewer'ом.
 */

import { useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { useSceneStore } from '@/store/useSceneStore';
import { usePhysicsDebugStore } from '@/store/usePhysicsDebugStore';
import { PhysicsMeshType, type SceneObjectData } from '@shared/types/scene';

const SEAM_LINE_COLOR = 0xff4444;
const FIXED_POINT_COLOR = 0xffdd33;
const FIXED_POINT_SIZE = 0.03;

function objectWorldMatrix(obj: SceneObjectData): THREE.Matrix4 {
  const pos = new THREE.Vector3(...obj.position);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...obj.rotation, 'XYZ'));
  const scale = new THREE.Vector3(...obj.scale);
  return new THREE.Matrix4().compose(pos, quat, scale);
}

/**
 * Индексы в seam_collection.json — CLOTH-LOCAL, в порядке конкатенации
 * cloth-объектов из objects_index.json (см. wgpu_utils/src/utils/
 * user_geometry_loader.ts). Т.к. loadPhysicsScene() сохраняет этот же
 * порядок при импорте, тот же порядок объектов (отфильтрованный по
 * physicsType === Cloth) восстанавливает соответствие. Ломается, если после
 * импорта объекты сцены удалялись/добавлялись — приемлемо для view-only
 * оверлея.
 */
function buildClothLocalResolver(objects: SceneObjectData[]) {
  const clothObjects = objects.filter(
    (o): o is SceneObjectData & { physicsMesh: NonNullable<SceneObjectData['physicsMesh']> } =>
      o.type === 'physicsMesh' && !!o.physicsMesh && o.physicsMesh.physicsType === PhysicsMeshType.Cloth,
  );

  const offsets: { obj: (typeof clothObjects)[number]; start: number }[] = [];
  let acc = 0;
  for (const obj of clothObjects) {
    offsets.push({ obj, start: acc });
    acc += obj.physicsMesh.vertexCount;
  }

  return function resolve(clothLocalIdx: number): { obj: SceneObjectData; localIdx: number } | null {
    for (const { obj, start } of offsets) {
      const count = obj.physicsMesh.vertexCount;
      if (clothLocalIdx >= start && clothLocalIdx < start + count) {
        return { obj, localIdx: clothLocalIdx - start };
      }
    }
    return null;
  };
}

function worldPositionOf(obj: SceneObjectData, localIdx: number, matrix: THREE.Matrix4): THREE.Vector3 | null {
  const positions = obj.physicsMesh?.positions;
  if (!positions || localIdx * 3 + 2 >= positions.length) return null;
  const p = new THREE.Vector3(positions[localIdx * 3], positions[localIdx * 3 + 1], positions[localIdx * 3 + 2]);
  return p.applyMatrix4(matrix);
}

export function PhysicsDebugOverlay() {
  const objects = useSceneStore((s) => s.objects);
  const seamCollection = usePhysicsDebugStore((s) => s.seamCollection);
  const showSeams = usePhysicsDebugStore((s) => s.showSeams);
  const showFixedPoints = usePhysicsDebugStore((s) => s.showFixedPoints);

  const matrices = useMemo(() => {
    const map = new Map<string, THREE.Matrix4>();
    for (const o of objects) map.set(o.id, objectWorldMatrix(o));
    return map;
  }, [objects]);

  const seamGeometry = useMemo(() => {
    if (!showSeams || !seamCollection || seamCollection.seams.length === 0) return null;
    const resolve = buildClothLocalResolver(objects);
    const points: number[] = [];
    for (const seam of seamCollection.seams) {
      for (const [a, b] of seam.stitches) {
        const ra = resolve(a);
        const rb = resolve(b);
        if (!ra || !rb) continue;
        const ma = matrices.get(ra.obj.id);
        const mb = matrices.get(rb.obj.id);
        if (!ma || !mb) continue;
        const pa = worldPositionOf(ra.obj, ra.localIdx, ma);
        const pb = worldPositionOf(rb.obj, rb.localIdx, mb);
        if (!pa || !pb) continue;
        points.push(pa.x, pa.y, pa.z, pb.x, pb.y, pb.z);
      }
    }
    if (points.length === 0) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
    return geom;
  }, [showSeams, seamCollection, objects, matrices]);

  const fixedPointsGeometry = useMemo(() => {
    if (!showFixedPoints) return null;
    const points: number[] = [];
    for (const obj of objects) {
      if (obj.type !== 'physicsMesh' || !obj.physicsMesh?.fixedVertices?.length) continue;
      const matrix = matrices.get(obj.id);
      if (!matrix) continue;
      for (const localIdx of obj.physicsMesh.fixedVertices) {
        const p = worldPositionOf(obj, localIdx, matrix);
        if (p) points.push(p.x, p.y, p.z);
      }
    }
    if (points.length === 0) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
    return geom;
  }, [showFixedPoints, objects, matrices]);

  return (
    <>
      {seamGeometry && (
        <lineSegments geometry={seamGeometry} renderOrder={999}>
          <lineBasicMaterial color={SEAM_LINE_COLOR} depthTest={false} transparent opacity={0.85} />
        </lineSegments>
      )}
      {fixedPointsGeometry && (
        <points geometry={fixedPointsGeometry} renderOrder={999}>
          <pointsMaterial color={FIXED_POINT_COLOR} size={FIXED_POINT_SIZE} sizeAttenuation depthTest={false} />
        </points>
      )}
    </>
  );
}
