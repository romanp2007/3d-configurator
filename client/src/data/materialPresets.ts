/**
 * Пресеты материалов, откалиброванные по KES-F (см. wgpu_utils/wiki/plans/
 * kesf_parameter_fitting.md) — kesf_fitting/materials_model_params copy.json,
 * та же таблица, что tests/style3d_falling_plane_test_entry.ts's MaterialEntry.
 * Импортируется напрямую как JSON-модуль через алиас @kesf-fitting (см.
 * vite.config.ts/tsconfig.json) — оба репозитория лежат рядом на диске, как
 * и с @wgpu/*.
 */

import rawPresets from '@kesf-fitting/materials_model_params copy.json';
import type { PhysicsMaterialProperties } from '@shared/types/scene';

export interface MaterialPreset {
  id: number;
  name_en: string;
  name_ru: string | null;
  composition: string;
  structure: string | null;
  thickness_mm: number;
  /** Warp stiffness [Н/м] — соответствует m_young_warp. */
  ku: number;
  /** Weft stiffness [Н/м] — соответствует m_young_weft. */
  kv: number;
  /** Shear stiffness [Н/м] — соответствует m_shear_modulus. */
  ks: number;
  /** Bend warp — соответствует m_bending_warp. */
  ku_b: number;
  /** Bend weft — соответствует m_bending_weft. */
  kv_b: number;
  /** Bend shear — соответствует m_bending_shear. */
  ks_b: number;
  density: number;
  friction: number;
  internal_damping: number;
}

export const MATERIAL_PRESETS: MaterialPreset[] = rawPresets as MaterialPreset[];

/**
 * Переводит пресет в частичный патч PhysicsMaterialProperties (meta.json's
 * material_properties). Поля без прямого аналога в пресете (m_stretch_stiffness,
 * m_poisson_weft/warp, m_bending_stiffness) НЕ трогаются — пресет их просто не
 * специфицирует, а не "обнуляет".
 *
 * internal_damping — единственное скалярное демпфирование в пресете,
 * применяется и к stretch-, и к bend-диссипации (в meta.json это два разных
 * поля, в KES-F пресете — одно общее).
 */
export function materialPropertiesFromPreset(preset: MaterialPreset): Partial<PhysicsMaterialProperties> {
  return {
    m_young_warp: preset.ku,
    m_young_weft: preset.kv,
    m_shear_modulus: preset.ks,
    m_bending_warp: preset.ku_b,
    m_bending_weft: preset.kv_b,
    m_bending_shear: preset.ks_b,
    m_density: preset.density,
    m_friction_coeff: preset.friction,
    m_thickness: preset.thickness_mm / 1000, // мм → м
    m_stretch_dissipation_warp: preset.internal_damping,
    m_bend_dissipation_warp: preset.internal_damping,
  };
}
