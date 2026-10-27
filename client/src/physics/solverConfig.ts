/**
 * Style3DSolverConfig для сцены редактора по настройкам PhysicsEngineSettings.
 * Чистая функция (без GPU/React) — используется PhysicsSimController и
 * проверяется headless.
 */

import type { Style3DSolverScene } from '@wgpu/physics/solver/style3d_scene';
import type { PhysicsEngineSettings } from '@/store/usePhysicsEngineSettingsStore';

export function buildSolverConfig(
  s: PhysicsEngineSettings,
  opts: { hasRigid: boolean; hasSeams: boolean },
): Parameters<typeof Style3DSolverScene.create>[2] {
  return {
    // Rigid-солвер корректно работает только с одной ньютоновской итерацией.
    numNewtonIters: opts.hasRigid ? 1 : s.numNewtonIters,
    numPcgIters: s.numPcgIters,
    numSubsteps: s.numSubsteps,
    adjustFactor: s.adjustFactor,
    contactFixedStiffness: s.contactFixedStiffness,
    contactFixedStiffnessEe: s.contactFixedStiffnessEe,
    contactDamping: s.contactDamping,
    contactDampingEe: s.contactDampingEe,
    contactStiffFactor: s.contactStiffFactor,
    contactStiffFactorEe: s.contactStiffFactorEe,
    contactHessReg: s.contactHessReg,
    contactHessRegEe: s.contactHessRegEe,
    stretchDamping: s.stretchDamping,
    bendDamping: s.bendDamping,
    contactFrictionMuPt: s.contactFrictionMu,
    contactFrictionMuEe: s.contactFrictionMu,
    ...(opts.hasRigid && {
      rigidContactStiffFactor: s.rigidContactStiffFactor,
      rigidContactDamping: s.rigidContactDamping,
      rigidContactFrictionMu: s.rigidContactFrictionMu,
      bodyBodyStiffFactor: s.bodyBodyStiffFactor,
      // Читается один раз при создании кернелов — присвоение после create() уже не действует.
      rigidBodyContactThickness: s.rigidBodyContactThickness,
      paddingAabb: s.rigidPaddingAabb,
    }),
    // 1 слот перетаскивания — DragTool в PhysicsSimController (активируется хоткеем DRAG_TOOL_KEY).
    maxDragPoints: 1,
    ...(opts.hasSeams && {
      seamStiffness: s.seamStiffness,
      seamMergeDistance: s.seamMergeDistance,
      // Обязателен для seam-сцен: без него runtime-пересборка PD-матрицы после слияния
      // стежков не выполняется, см. wiki/plans/seaming.md, «Открытые вопросы», п.3.
      gpuPdMatrixRebuild: true,
    }),
  };
}
