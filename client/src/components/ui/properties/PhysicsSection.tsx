/**
 * Секция Physics для physicsMesh-объектов (сцены newton/user_geometry) —
 * редактирование material_properties/ortho_stiffness/damping (зеркало
 * meta.json), см. wiki/plans/3d_configurator_integration.md, Этап 4.
 *
 * physicsType и геометрические счётчики — read-only (смена Cloth↔Static
 * или геометрии не входит в MVP, см. Non-goals в плане).
 */

import { useState } from 'react';
import type { SceneObjectData, PhysicsMaterialProperties } from '@shared/types/scene';
import { PhysicsMeshType } from '@shared/types/scene';
import { usePhysicsSceneApi } from '@/hooks/usePhysicsSceneApi';
import { getStoredPhysicsServer } from '@/api/physicsSceneApi';
import { usePhysicsDebugStore } from '@/store/usePhysicsDebugStore';
import { toast } from '@/store/useToastStore';
import { ClothMaterialEditor, NumberField } from './ClothMaterialEditor';

interface PhysicsSectionProps {
  object: SceneObjectData;
  onUpdate: (id: string, updates: Partial<SceneObjectData>) => void;
}

export function PhysicsSection({ object, onUpdate }: PhysicsSectionProps) {
  const { saveObjectMeta, loading } = usePhysicsSceneApi();
  const [saving, setSaving] = useState(false);
  const showSeams = usePhysicsDebugStore((s) => s.showSeams);
  const showFixedPoints = usePhysicsDebugStore((s) => s.showFixedPoints);
  const toggleShowSeams = usePhysicsDebugStore((s) => s.toggleShowSeams);
  const toggleShowFixedPoints = usePhysicsDebugStore((s) => s.toggleShowFixedPoints);

  const pm = object.physicsMesh;
  if (!pm) return null;

  const isCloth = pm.physicsType === PhysicsMeshType.Cloth;

  const handleSave = async () => {
    setSaving(true);
    const ok = await saveObjectMeta(object, getStoredPhysicsServer());
    setSaving(false);
    if (ok) {
      toast.success(`meta.json "${pm.uuid}" сохранён`);
    } else {
      toast.error(`Не удалось сохранить meta.json для "${pm.uuid}" — см. консоль`);
    }
  };

  const handleMaterialChange = (key: keyof PhysicsMaterialProperties, value: number) => {
    onUpdate(object.id, {
      physicsMesh: {
        ...pm,
        materialProperties: { ...pm.materialProperties, [key]: value },
      },
    });
  };

  const handleMetaChange = (key: 'orthoStiffness' | 'damping', value: number) => {
    onUpdate(object.id, { physicsMesh: { ...pm, [key]: value } });
  };

  return (
    <div className="mb-4 pb-4 border-b border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-medium text-sm">Physics (newton/user_geometry)</h3>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-2 py-1 text-xs rounded bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
          title="Сохранить transform + material_properties в meta.json (только эти поля — геометрия/швы не трогаются)"
        >
          {saving ? '…' : '💾 meta.json'}
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
        <span className={`px-2 py-0.5 rounded ${isCloth ? 'bg-amber-700 text-amber-100' : 'bg-gray-600 text-gray-200'}`}>
          {isCloth ? 'Cloth' : 'Static'}
        </span>
        <span>
          {pm.vertexCount} вершин, {pm.primCount} треугольников
        </span>
      </div>

      <div className="mb-3">
        <label className="block text-gray-400 text-xs mb-2">Meta</label>
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Ortho stiffness"
            value={pm.orthoStiffness}
            step={1}
            onChange={(v) => handleMetaChange('orthoStiffness', v)}
          />
          <NumberField
            label="Damping"
            value={pm.damping}
            step={0.00001}
            onChange={(v) => handleMetaChange('damping', v)}
          />
          {/* layer лежит внутри material_properties (см. meta.json), не
              рядом с ortho_stiffness/damping — но визуально логичнее держать
              его тут же, среди "мета"-полей объекта. */}
          <NumberField
            label="Layer"
            value={pm.materialProperties.layer}
            step={1}
            onChange={(v) => handleMaterialChange('layer', Math.round(v))}
          />
        </div>
      </div>

      <ClothMaterialEditor
        value={pm.materialProperties}
        onChange={(materialProperties) => onUpdate(object.id, { physicsMesh: { ...pm, materialProperties } })}
        presetHint="не забудьте сохранить meta.json"
      />

      {isCloth && (
        <div className="text-xs text-gray-500 mb-2">
          Закреплённых вершин: {pm.fixedVertices?.length ?? 0}
          {pm.uv2D ? ` · UV-развёртка: ${pm.uv2D.length / 2} точек` : ''}
        </div>
      )}

      {/* Оверлей — глобальный на всю сцену, не только на этот объект (см.
          PhysicsDebugOverlay.tsx, Этап 4b) */}
      <div className="flex flex-col gap-1.5 text-xs text-gray-300">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showSeams} onChange={toggleShowSeams} className="rounded" />
          <span>Показать швы (красные линии)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={showFixedPoints} onChange={toggleShowFixedPoints} className="rounded" />
          <span>Показать закреплённые вершины (жёлтые точки)</span>
        </label>
      </div>
    </div>
  );
}
