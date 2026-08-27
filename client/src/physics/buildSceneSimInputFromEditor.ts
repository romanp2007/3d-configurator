/**
 * Живой стор редактора (SceneObjectData[]) → SceneSimInput для
 * Style3DSolverScene. Аналог loadSceneSimInput() из wgpu_utils/src/utils/
 * user_geometry_loader.ts, но источник данных — не диск, а текущее
 * (возможно, отредактированное — подвинутое/повёрнутое/с изменённым meta)
 * состояние стора. Оба уже в Y-up (см. physicsSceneApi.ts) — дополнительной
 * конвертации осей здесь не нужно.
 *
 * positions в PhysicsMeshData — ЛОКАЛЬНОЕ пространство; obj.loc/rot/scale —
 * живой transform из стора. buildSolverSceneData()/scene_to_solver.ts сам
 * применяет obj.getMat4() при сборке vertexData (см. scene_to_solver.ts:456)
 * — здесь трансформ НЕ запекается в positions, см. wiki/plans/
 * 3d_configurator_integration.md, «Ключевая находка» и Этап 6.
 */

import * as THREE from 'three';
import { quat as glQuat, vec3 as glVec3, mat4 as glMat4 } from 'gl-matrix';
import type { SceneObjectData } from '@shared/types/scene';
import { PhysicsMeshType } from '@shared/types/scene';
import {
  PhysicsType,
  PhysObject,
  type SceneSimInput,
} from '@wgpu/physics/solver/scene_sim_input';

function eulerToGlQuat(rotation: [number, number, number]): glQuat {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ'));
  return glQuat.fromValues(q.x, q.y, q.z, q.w);
}

// PhysicsMeshType (shared/types/scene.ts, независим от wgpu_utils — общий
// с Express-сервером 3d-configurator, у которого нет доступа к @wgpu/*) и
// PhysicsType (wgpu_utils/src) — два независимо объявленных enum с
// ОДИНАКОВЫМИ числовыми значениями (1=Cloth, 2=Static). TS не даёт сравнивать
// значения двух разных enum-типов напрямую (TS2367) — сравниваем как числа.
function isClothMesh(physicsType: PhysicsMeshType): boolean {
  return (physicsType as number) === (PhysicsType.Cloth as number);
}

/** Половина стороны пола [м] — плоскость 2×GROUND_PLANE_HALF_SIZE. */
const GROUND_PLANE_HALF_SIZE = 25;

/**
 * Синтетический статический коллайдер — плоскость пола на y=0, всегда
 * добавляется первым STATIC-объектом сцены. Не соответствует никакому
 * SceneObjectData (не выбирается/не редактируется в редакторе — совпадает
 * визуально с декоративной плоскостью пола в SceneView.tsx, но именно ЭТОТ
 * объект участвует в коллизиях, декоративная — нет).
 */
function buildGroundPlanePhysObject(vertexOffset: number, faceOffset: number): PhysObject {
  const s = GROUND_PLANE_HALF_SIZE;
  // 4 вершины, 2 треугольника, нормаль +Y (см. вывод винда в комментарии ниже).
  const positions = new Float32Array([
    -s, 0, -s,
    -s, 0, s,
    s, 0, s,
    s, 0, -s,
  ]);
  // (v0,v1,v2) и (v0,v2,v3): cross(v1-v0, v2-v0) = (0, 4s², 0) — нормаль вверх.
  const faces = new Uint32Array([0, 1, 2, 0, 2, 3]);

  return new PhysObject({
    uuid: '__ground_plane__',
    physicsType: PhysicsType.Static,
    positions,
    faces,
    vertexCount: 4,
    primCount: 2,
    getMat4: () => glMat4.create(),
    vertexOffset,
    faceOffset,
    fixedVertices: [],
    // Identity — positions уже в мировых координатах (y=0), доп. transform не нужен.
    loc: glVec3.create(),
    rot: glQuat.create(),
    scale: glVec3.fromValues(1, 1, 1),
  });
}

/**
 * Отбирает видимые physicsMesh-объекты сцены, упорядоченные STATIC → CLOTH,
 * и добавляет синтетическую плоскость пола (см. buildGroundPlanePhysObject)
 * первым STATIC-объектом — иначе ткань падает бесконечно, не с чем
 * сталкиваться, если сцена не содержит собственного манекена/подставки.
 */
export function buildSceneSimInputFromEditor(objects: SceneObjectData[]): SceneSimInput {
  const physicsObjects = objects.filter((o) => o.type === 'physicsMesh' && o.visible && o.physicsMesh);
  
  const statics = physicsObjects.filter((o) => !isClothMesh(o.physicsMesh!.physicsType));
  const cloths = physicsObjects.filter((o) => isClothMesh(o.physicsMesh!.physicsType));
  
  const groundPlane = buildGroundPlanePhysObject(0, 0);

  const ordered = [ ...statics, ...cloths];

  
  let vertexOffset = groundPlane.vertexCount;
  let faceOffset = groundPlane.primCount;

  const built: PhysObject[] = ordered.map((o) => {
    const pm = o.physicsMesh!;
    const obj = new PhysObject({
      uuid: pm.uuid,
      physicsType: isClothMesh(pm.physicsType) ? PhysicsType.Cloth : PhysicsType.Static,
      positions: pm.positions,
      faces: pm.indices,
      // Игнорируются конструктором PhysObject (пересчитывает из positions/
      // faces.length), но обязательны по типу IPhysObject — см. scene_sim_input.ts.
      vertexCount: pm.vertexCount,
      primCount: pm.primCount,
      getMat4: () => glMat4.create(),
      vertexOffset,
      faceOffset,
      uv2D: pm.uv2D,
      layer:pm.materialProperties.layer,
      fixedVertices: pm.fixedVertices ?? [],
      loc: glVec3.fromValues(o.position[0], o.position[1], o.position[2]),
      rot: eulerToGlQuat(o.rotation),
      scale: glVec3.fromValues(o.scale[0], o.scale[1], o.scale[2]),
      // Физические свойства материала:
      density: pm.materialProperties.m_density, // кг/м^2
      thickness: pm.materialProperties.m_thickness, // мм
      stretchStiffness: pm.materialProperties.m_stretch_stiffness,
      "ku": pm.materialProperties.m_young_warp,
      "kv": pm.materialProperties.m_young_weft,
      "ks": pm.materialProperties.m_shear_modulus,
      "bendKu": pm.materialProperties.m_bending_warp,
      "bendKv": pm.materialProperties.m_bending_weft,
      "bendKs": pm.materialProperties.m_bending_shear
    });
    vertexOffset += obj.vertexCount;
    faceOffset += obj.primCount;
    return obj;
  });

  const staticVertexCount = statics.reduce((s, o) => s + o.physicsMesh!.vertexCount, 0) + groundPlane.vertexCount;

  return {
    objects: [groundPlane,...built],
    totalVertexCount: vertexOffset,
    totalPrimCount: faceOffset,
    staticCount: statics.length+1,
    rigidBodyCount: 0,
    clothCount: cloths.length,
    rigidBodyVertexStart: staticVertexCount,
    clothVertexStart: staticVertexCount,
  };
}
