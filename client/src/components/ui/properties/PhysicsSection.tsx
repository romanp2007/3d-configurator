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
import { MATERIAL_PRESETS, materialPropertiesFromPreset } from '@/data/materialPresets';

interface PhysicsSectionProps {
  object: SceneObjectData;
  onUpdate: (id: string, updates: Partial<SceneObjectData>) => void;
}

interface FieldSpec {
  key: keyof PhysicsMaterialProperties;
  label: string;
  step: number;
}

// Группировка полей как в meta.json (Style3D KES-F-подобные параметры) —
// см. PhysicsMaterialProperties в shared/types/scene.ts.
const STRETCH_FIELDS: FieldSpec[] = [
  { key: 'm_stretch_stiffness', label: 'Stretch stiffness', step: 100 },
  { key: 'm_young_weft', label: 'Young (weft)', step: 1 },
  { key: 'm_young_warp', label: 'Young (warp)', step: 1 },
  { key: 'm_shear_modulus', label: 'Shear modulus', step: 1 },
  { key: 'm_poisson_weft', label: 'Poisson (weft)', step: 0.01 },
  { key: 'm_poisson_warp', label: 'Poisson (warp)', step: 0.01 },
  { key: 'm_stretch_dissipation_warp', label: 'Stretch dissipation', step: 0.001 },
];

const BEND_FIELDS: FieldSpec[] = [
  { key: 'm_bending_stiffness', label: 'Bending stiffness', step: 1e-7 },
  { key: 'm_bending_warp', label: 'Bending (warp)', step: 0.00001 },
  { key: 'm_bending_weft', label: 'Bending (weft)', step: 0.00001 },
  { key: 'm_bending_shear', label: 'Bending (shear)', step: 0.00001 },
  { key: 'm_bend_dissipation_warp', label: 'Bend dissipation', step: 0.001 },
];

const PHYSICAL_FIELDS: FieldSpec[] = [
  { key: 'm_density', label: 'Density [кг/м²]', step: 0.01 },
  { key: 'm_thickness', label: 'Thickness [м]', step: 0.0001 },
  { key: 'm_friction_coeff', label: 'Friction', step: 0.01 },
];

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
}) {
  return (
    <div>
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        className="w-full bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
      />
    </div>
  );
}

function FieldGroup({
  title,
  fields,
  materialProperties,
  onFieldChange,
}: {
  title: string;
  fields: FieldSpec[];
  materialProperties: PhysicsMaterialProperties;
  onFieldChange: (key: keyof PhysicsMaterialProperties, value: number) => void;
}) {
  return (
    <div className="mb-3">
      <label className="block text-gray-400 text-xs mb-2">{title}</label>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <NumberField
            key={f.key}
            label={f.label}
            value={materialProperties[f.key]}
            step={f.step}
            onChange={(val) => onFieldChange(f.key, val)}
          />
        ))}
      </div>
    </div>
  );
}

export function PhysicsSection({ object, onUpdate }: PhysicsSectionProps) {
  const { saveObjectMeta, loading } = usePhysicsSceneApi();
  const [saving, setSaving] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('');
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

  /**
   * Применяет пресет ОДНИМ обновлением стора (не по полю через
   * handleMaterialChange) — так это один шаг undo-истории, а не 10 подряд.
   * Поля без аналога в пресете (m_stretch_stiffness, m_poisson_*,
   * m_bending_stiffness) не трогаются, см. materialPropertiesFromPreset().
   */
  const handleApplyPreset = () => {
    if (selectedPresetId === '') return;
    const preset = MATERIAL_PRESETS.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    onUpdate(object.id, {
      physicsMesh: {
        ...pm,
        materialProperties: { ...pm.materialProperties, ...materialPropertiesFromPreset(preset) },
      },
    });
    toast.success(`Материал «${preset.name_en}» применён — не забудьте сохранить meta.json`);
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
        <label className="block text-gray-400 text-xs mb-2">Пресет материала (KES-F)</label>
        <div className="flex gap-2">
          <select
            value={selectedPresetId}
            onChange={(e) => setSelectedPresetId(e.target.value === '' ? '' : Number(e.target.value))}
            className="flex-1 min-w-0 bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
          >
            <option value="">— выбрать —</option>
            {MATERIAL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_en} ({p.composition})
              </option>
            ))}
          </select>
          <button
            onClick={handleApplyPreset}
            disabled={selectedPresetId === ''}
            className="px-3 py-1.5 text-sm rounded bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white transition-colors"
            title="Заменить Young/Shear/Bending/Density/Friction/Thickness выбранным пресетом"
          >
            Применить
          </button>
        </div>
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

      <FieldGroup
        title="Stretch / Shear"
        fields={STRETCH_FIELDS}
        materialProperties={pm.materialProperties}
        onFieldChange={handleMaterialChange}
      />
      <FieldGroup
        title="Bending"
        fields={BEND_FIELDS}
        materialProperties={pm.materialProperties}
        onFieldChange={handleMaterialChange}
      />
      <FieldGroup
        title="Физические"
        fields={PHYSICAL_FIELDS}
        materialProperties={pm.materialProperties}
        onFieldChange={handleMaterialChange}
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
