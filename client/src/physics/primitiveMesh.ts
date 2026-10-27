/**
 * Меши примитивов редактора (куб, сфера, цилиндр, конус, плоскость, тор) с
 * настраиваемой дискретизацией. ЕДИНЫЙ источник геометрии: и рендер
 * (SceneObject.tsx), и физика (buildSceneSimInputFromEditor.ts) берут меш
 * отсюда — нарисованное равно тому, что сталкивается.
 *
 * Все примитивы — ЕДИНИЧНЫЕ (размер задаёт scale объекта), как и раньше с
 * three-геометриями:
 *   box — 1×1×1; sphere — радиус 0.5; cylinder/cone — радиус 0.5, высота 1 (ось Y);
 *   plane — 1×1 в плоскости XZ (нормаль +Y, как в движке; раньше была XY);
 *   torus — большой радиус 0.5, малый 0.2 (в плоскости XZ).
 */

import {
  createBox,
  createCone,
  createCylinder,
  createPlane,
  createSphere,
  createTorus,
  type MeshData,
} from '@wgpu/geometry/primitives';
import type { GeometryParams, ObjectType } from '@shared/types/scene';

export type PrimitiveType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'torus';

const PRIMITIVE_TYPES: ReadonlySet<ObjectType> = new Set<ObjectType>([
  'box',
  'sphere',
  'cylinder',
  'cone',
  'plane',
  'torus',
]);

export function isPrimitiveType(type: ObjectType): type is PrimitiveType {
  return PRIMITIVE_TYPES.has(type);
}

/** Дискретизация по умолчанию (используется и для старых сцен без поля geometry). */
export const DEFAULT_GEOMETRY_PARAMS: Record<PrimitiveType, GeometryParams> = {
  box: { segX: 1, segY: 1, segZ: 1 },
  sphere: { latSegments: 16, lonSegments: 32 },
  cylinder: { radialSegments: 32, heightSegments: 1 },
  cone: { radialSegments: 32, heightSegments: 1 },
  plane: { segX: 1, segZ: 1 },
  torus: { majorSegments: 32, minorSegments: 16 },
};

/** Описание полей дискретизации примитива для UI: ключ, подпись, минимум. */
export interface GeometryFieldSpec {
  key: keyof GeometryParams;
  label: string;
  min: number;
}

export const GEOMETRY_FIELDS: Record<PrimitiveType, GeometryFieldSpec[]> = {
  box: [
    { key: 'segX', label: 'Сегменты X', min: 1 },
    { key: 'segY', label: 'Сегменты Y', min: 1 },
    { key: 'segZ', label: 'Сегменты Z', min: 1 },
  ],
  sphere: [
    { key: 'latSegments', label: 'Широтные', min: 2 },
    { key: 'lonSegments', label: 'Долготные', min: 3 },
  ],
  cylinder: [
    { key: 'radialSegments', label: 'По окружности', min: 3 },
    { key: 'heightSegments', label: 'По высоте', min: 1 },
  ],
  cone: [
    { key: 'radialSegments', label: 'По окружности', min: 3 },
    { key: 'heightSegments', label: 'По высоте', min: 1 },
  ],
  plane: [
    { key: 'segX', label: 'Сегменты X', min: 1 },
    { key: 'segZ', label: 'Сегменты Z', min: 1 },
  ],
  torus: [
    { key: 'majorSegments', label: 'Большой круг', min: 3 },
    { key: 'minorSegments', label: 'Малый круг', min: 3 },
  ],
};

/** Верхняя граница сегментов на одно измерение — защита от случайного ввода 10⁶. */
export const MAX_SEGMENTS = 256;

function seg(value: number | undefined, fallback: number, min: number): number {
  const v = Number.isFinite(value) ? Math.round(value as number) : fallback;
  return Math.min(MAX_SEGMENTS, Math.max(min, v));
}

/** Параметры с подставленными значениями по умолчанию и зажатыми в допустимые границы. */
export function resolveGeometryParams(type: PrimitiveType, params?: GeometryParams): GeometryParams {
  const d = DEFAULT_GEOMETRY_PARAMS[type];
  const out: GeometryParams = {};
  for (const f of GEOMETRY_FIELDS[type]) {
    out[f.key] = seg(params?.[f.key], d[f.key] as number, f.min);
  }
  return out;
}

/** Меш примитива. Вершины на швах/полюсах дублируются (как у createSphere и др.) — для физики склеивать weldMesh. */
export function buildPrimitiveMesh(type: PrimitiveType, params?: GeometryParams): MeshData {
  const p = resolveGeometryParams(type, params);
  switch (type) {
    case 'box':
      return createBox(1, 1, 1, p.segX, p.segY, p.segZ);
    case 'sphere':
      return createSphere(0.5, p.latSegments, p.lonSegments);
    case 'cylinder':
      return createCylinder(0.5, 0.5, 1, p.radialSegments, p.heightSegments);
    case 'cone':
      return createCone(0.5, 1, p.radialSegments, p.heightSegments);
    case 'plane':
      return createPlane(1, 1, p.segX, p.segZ);
    case 'torus':
      return createTorus(0.5, 0.2, p.majorSegments, p.minorSegments);
  }
}

/** Ось «длины» примитива для подгонки капсулы/цилиндра (все осевые примитивы — вдоль Y). */
export const PRIMITIVE_AXIS_HINT: Partial<Record<PrimitiveType, 0 | 1 | 2>> = {
  cylinder: 1,
  cone: 1,
  torus: 1,
};
