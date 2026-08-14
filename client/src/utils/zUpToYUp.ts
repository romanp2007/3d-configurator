/**
 * Сцены newton/user_geometry экспортированы в Z-up (Style3D), весь остальной
 * проект (гравитация, рендер) — в Y-up. wgpu_utils/src/utils/user_geometry_loader.ts
 * конвертирует world-space позиции поворотом -90° вокруг X: (x,y,z) → (x,z,-y)
 * (СОБСТВЕННЫЙ поворот, det=+1 — winding/нормали не переворачиваются).
 *
 * В редакторе геометрия хранится в ЛОКАЛЬНОМ пространстве, а world-space
 * получается через position/rotation/scale меша (см. wiki/plans/
 * 3d_configurator_integration.md, «Ключевая находка»). Поэтому Z-up→Y-up
 * нужно распределить на ДВЕ части так, чтобы результат совпадал с уже
 * проверенным world = R · (M · local) из user_geometry_loader.ts:
 *
 *   world_Yup = R · world_Zup = R · (M · local) = (R·M·R⁻¹) · (R·local)
 *
 * — т.е. local_Yup = R·local (применяется к vertices.bin один раз при
 * импорте), а сам object-transform конъюгируется: M_Yup = R·M·R⁻¹.
 * Для TRS-разложения (loc, rot, scale) конъюгация фиксированной R
 * (= поворот -90° вокруг X, координатная ПЕРЕСТАНОВКА со знаком) даёт:
 *   loc_Yup   = R · loc                              (обычный поворот вектора)
 *   rot_Yup   = q_R ⊗ rot ⊗ q_R⁻¹                     (сопряжение кватерниона)
 *   scale_Yup = (scale.x, scale.z, scale.y)           (перестановка Y↔Z —
 *               конъюгация диагонали signed-permutation матрицей остаётся
 *               диагональю с переставленными компонентами)
 */

import { quat } from 'gl-matrix';

/** Кватернион поворота -90° вокруг X (xyzw), т.е. самой R. */
const Q_ZUP_TO_YUP = quat.fromValues(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
const Q_ZUP_TO_YUP_INV = quat.conjugate(quat.create(), Q_ZUP_TO_YUP); // unit quat: conjugate == inverse

/** (x, y, z) → (x, z, -y). Применяется к позициям/направлениям. */
export function zUpToYUpVec3(x: number, y: number, z: number): [number, number, number] {
  return [x, z, -y];
}

/** Применяет zUpToYUpVec3 ко всем вершинам stride-3 буфера (in place допустимо только если dst !== src). */
export function zUpToYUpPositions(src: Float32Array): Float32Array {
  const dst = new Float32Array(src.length);
  for (let i = 0; i < src.length; i += 3) {
    const [x, y, z] = zUpToYUpVec3(src[i], src[i + 1], src[i + 2]);
    dst[i] = x;
    dst[i + 1] = y;
    dst[i + 2] = z;
  }
  return dst;
}

/** Конъюгирует кватернион (xyzw) той же R, что и zUpToYUpVec3. */
export function zUpToYUpQuat(q: [number, number, number, number]): [number, number, number, number] {
  const tmp = quat.multiply(quat.create(), Q_ZUP_TO_YUP, q);
  const result = quat.multiply(quat.create(), tmp, Q_ZUP_TO_YUP_INV);
  return [result[0], result[1], result[2], result[3]];
}

/** Перестановка Y↔Z для диагонального scale — см. вывод в заголовке файла. */
export function zUpToYUpScale(x: number, y: number, z: number): [number, number, number] {
  return [x, z, y];
}

// ---------------------------------------------------------------------------
// Обратные преобразования (Y-up редактора → Z-up meta.json), для записи
// отредактированного transform обратно на диск (Этап 5, write-meta).
// ---------------------------------------------------------------------------

/** Обратное к zUpToYUpVec3: (x, y, z) → (x, -z, y). */
export function yUpToZUpVec3(x: number, y: number, z: number): [number, number, number] {
  return [x, -z, y];
}

/** Обратное к zUpToYUpQuat: сопряжение той же R, но в обратном порядке (q_R⁻¹ ⊗ q ⊗ q_R). */
export function yUpToZUpQuat(q: [number, number, number, number]): [number, number, number, number] {
  const tmp = quat.multiply(quat.create(), Q_ZUP_TO_YUP_INV, q);
  const result = quat.multiply(quat.create(), tmp, Q_ZUP_TO_YUP);
  return [result[0], result[1], result[2], result[3]];
}

/** Перестановка Y↔Z самообратна — то же преобразование, что и вперёд. */
export const yUpToZUpScale = zUpToYUpScale;
