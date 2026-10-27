/**
 * Секция «Геометрия»: дискретизация примитивов (число сегментов) и сведения о
 * меше-ассете. Меш примитива строится buildPrimitiveMesh — тем же, что идёт и в
 * рендер, и в физику, поэтому счётчики здесь — фактические числа симуляции.
 */

import { useMemo } from 'react';
import type { GeometryParams, SceneObjectData } from '@shared/types/scene';
import { weldMesh } from '@wgpu/geometry/mesh_utils';
import { useAssetMesh } from '@/hooks/useAssetMesh';
import {
  buildPrimitiveMesh,
  GEOMETRY_FIELDS,
  isPrimitiveType,
  MAX_SEGMENTS,
  resolveGeometryParams,
  type PrimitiveType,
} from '@/physics/primitiveMesh';
import { NumberField } from './ClothMaterialEditor';

interface GeometrySectionProps {
  object: SceneObjectData;
  onUpdate: (id: string, updates: Partial<SceneObjectData>) => void;
}

/** Предупреждение о тяжёлой плоскости/ткани: > 150×150 сегментов — десятки тысяч вершин. */
const HEAVY_VERTEX_COUNT = 22_500;

function PrimitiveGeometry({ object, onUpdate }: GeometrySectionProps) {
  const type = object.type as PrimitiveType;
  const params = resolveGeometryParams(type, object.geometry);
  const paramsKey = JSON.stringify(params);

  const counts = useMemo(() => {
    const raw = buildPrimitiveMesh(type, JSON.parse(paramsKey));
    // Для физики вершины склеиваются (шов/полюса), кроме плоскости — там дублей нет.
    const physics = type === 'plane' ? raw : weldMesh(raw);
    return { vertices: physics.vertices.length / 3, triangles: physics.indices.length / 3 };
  }, [type, paramsKey]);

  const setField = (key: keyof GeometryParams, min: number, value: number) => {
    const v = Math.min(MAX_SEGMENTS, Math.max(min, Math.round(value)));
    onUpdate(object.id, { geometry: { ...params, [key]: v } });
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-2">
        {GEOMETRY_FIELDS[type].map((f) => (
          <NumberField
            key={f.key}
            label={f.label}
            value={params[f.key] as number}
            step={1}
            min={f.min}
            onChange={(v) => setField(f.key, f.min, v)}
          />
        ))}
      </div>
      <div className="text-xs text-gray-500">
        {counts.vertices} вершин, {counts.triangles} треугольников
      </div>
      {counts.vertices > HEAVY_VERTEX_COUNT && (
        <div className="text-xs text-amber-400 mt-1">Много вершин — симуляция может быть медленной</div>
      )}
    </>
  );
}

function AssetGeometry({ object }: { object: SceneObjectData }) {
  const { mesh, error } = useAssetMesh(object.assetMesh?.assetId);
  if (error) return <div className="text-xs text-red-400">Ошибка загрузки ассета: {error}</div>;
  if (!mesh) return <div className="text-xs text-gray-500">Загрузка ассета…</div>;
  return (
    <div className="text-xs text-gray-400 space-y-1">
      <div className="text-gray-300 truncate" title={mesh.id}>
        {mesh.id}
      </div>
      <div>
        {mesh.vertexCount} вершин, {mesh.triangleCount} треугольников
      </div>
      <div>
        Габариты в файле: {mesh.size.map((x) => x.toFixed(2)).join(' × ')}
        {mesh.defaultScale !== 1 ? ` (при импорте применён масштаб ${mesh.defaultScale})` : ''}
      </div>
    </div>
  );
}

export function GeometrySection({ object, onUpdate }: GeometrySectionProps) {
  const isAsset = object.type === 'assetMesh';
  if (!isAsset && !isPrimitiveType(object.type)) return null;

  return (
    <div className="mb-4 pb-4 border-b border-gray-700">
      <h3 className="text-white font-medium text-sm mb-3">{isAsset ? 'Меш' : 'Геометрия (дискретизация)'}</h3>
      {isAsset ? <AssetGeometry object={object} /> : <PrimitiveGeometry object={object} onUpdate={onUpdate} />}
    </div>
  );
}
