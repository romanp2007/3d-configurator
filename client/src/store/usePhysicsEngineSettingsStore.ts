/**
 * Настройки GPU-солвера (Style3DSolverConfig) — глобальные для сцены, не
 * per-object. Раньше были жёстко зашиты в PhysicsSimController.startSimulation()
 * (см. историю в wiki/changelog/3d_configurator_integration.md) — вынесены
 * сюда, чтобы редактировать их из UI (PhysicsEngineSettingsDialog.tsx).
 *
 * Значения по умолчанию — те, что уже были захардкожены и использовались
 * при экспериментах с реальными сценами (см. Style3DSolverConfig в
 * wgpu_utils/src/physics/solver/style3d_solver.ts для смысла каждого поля
 * и его "заводского" дефолта самого солвера — они не всегда совпадают:
 * этот стор фиксирует уже настроенные под сцены 3d-configurator значения).
 *
 * Применяются ТОЛЬКО в момент старта симуляции (Style3DSolverScene.create())
 * — правка настроек во время активной симуляции/паузы не имеет эффекта на
 * уже запущенный солвер, только на следующий запуск (▶ Симуляция / ↺ Reset).
 */

import { create } from 'zustand';

export interface PhysicsEngineSettings {
  /** Шаг интегрирования, передаётся в step()/stepWithSeaming() каждый кадр [с]. */
  dt: number;
  /** Число подшагов по времени за один вызов step(). */
  numSubsteps: number;
  /** Нелинейных итераций Projective Dynamics за подшаг. */
  numNewtonIters: number;
  /** Итераций PCG на каждую нелинейную итерацию. */
  numPcgIters: number;

  /** Фиксированная жёсткость [Н/м] PT-контактов во время seam-time солвера. */
  contactFixedStiffness: number;
  /** То же для EE-контактов. */
  contactFixedStiffnessEe: number;
  /** Вязкое демпфирование PT-контактов (Rayleigh), гасит дрожание/отскок. */
  contactDamping: number;
  /** То же для EE-контактов. */
  contactDampingEe: number;
  /** Множитель жёсткости PT-контактов (harmonic mean pd_diags × stiffFactor). */
  contactStiffFactor: number;
  /** То же для EE-контактов. */
  contactStiffFactorEe: number;
  /** Регуляризация Гессиана PT-контактов (устойчивость PCG). */
  contactHessReg: number;
  /** Регуляризация Гессиана EE-контактов. */
  contactHessRegEe: number;

  /** Демпфирование stretch-tri FEM-ограничений (0..1, критическое = 1). */
  stretchDamping: number;
  /** Демпфирование bend-ограничений (0..1). */
  bendDamping: number;

  /** Множитель жёсткости simple-stretch за один вызов stepStiffAdjust(). */
  adjustFactor: number;
  /** Жёсткость [Н/м] пружины притяжения стежков (SeamAttractKernel), L0=0. */
  seamStiffness: number;
  /** Порог сближения [м] для слияния стежка. */
  seamMergeDistance: number;
}

export const DEFAULT_PHYSICS_ENGINE_SETTINGS: PhysicsEngineSettings = {
  dt: 0.01,
  numSubsteps: 10,
  numNewtonIters: 1,
  numPcgIters: 10,

  contactFixedStiffness: 1e4,
  contactFixedStiffnessEe: 1e4,
  contactDamping: 1e-5,
  contactDampingEe: 1e-5,
  contactStiffFactor: 0.1,
  contactStiffFactorEe: 0.1,
  contactHessReg: 1e-9,
  contactHessRegEe: 1e-9,

  stretchDamping: 1e-13,
  bendDamping: 1e-13,

  adjustFactor: 1e5 / 100,
  seamStiffness: 1e4,
  seamMergeDistance: 0.03,
};

interface PhysicsEngineSettingsStore {
  settings: PhysicsEngineSettings;
  setField: <K extends keyof PhysicsEngineSettings>(key: K, value: PhysicsEngineSettings[K]) => void;
  resetToDefaults: () => void;
}

export const usePhysicsEngineSettingsStore = create<PhysicsEngineSettingsStore>((set) => ({
  settings: { ...DEFAULT_PHYSICS_ENGINE_SETTINGS },
  setField: (key, value) =>
    set((s) => ({ settings: { ...s.settings, [key]: value } })),
  resetToDefaults: () => set({ settings: { ...DEFAULT_PHYSICS_ENGINE_SETTINGS } }),
}));
