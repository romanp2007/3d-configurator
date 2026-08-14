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

/** Отбирает видимые physicsMesh-объекты сцены, упорядоченные STATIC → CLOTH. */
export function buildSceneSimInputFromEditor(objects: SceneObjectData[]): SceneSimInput {
  const physicsObjects = objects.filter((o) => o.type === 'physicsMesh' && o.visible && o.physicsMesh);
  const statics = physicsObjects.filter((o) => !isClothMesh(o.physicsMesh!.physicsType));
  const cloths = physicsObjects.filter((o) => isClothMesh(o.physicsMesh!.physicsType));
  const ordered = [...statics, ...cloths];

  let vertexOffset = 0;
  let faceOffset = 0;
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
      density: pm.materialProperties.m_density,
      thickness: pm.materialProperties.m_thickness,
      stretchStiffness: pm.materialProperties.m_stretch_stiffness,
      fixedVertices: pm.fixedVertices ?? [],
      loc: glVec3.fromValues(o.position[0], o.position[1], o.position[2]),
      rot: eulerToGlQuat(o.rotation),
      scale: glVec3.fromValues(o.scale[0], o.scale[1], o.scale[2]),
      "ku": 5248.47,
      "kv": 5633.4,
      "ks": 19.3328,
      "bendKu": 5.5917e-06,
      "bendKv": 3.2373e-06,
      "bendKs": 4.4145e-06
    });
    vertexOffset += obj.vertexCount;
    faceOffset += obj.primCount;
    return obj;
  });

  const staticVertexCount = statics.reduce((s, o) => s + o.physicsMesh!.vertexCount, 0);

  return {
    objects: built,
    totalVertexCount: vertexOffset,
    totalPrimCount: faceOffset,
    staticCount: statics.length,
    clothCount: cloths.length,
    clothVertexStart: staticVertexCount,
  };
}
