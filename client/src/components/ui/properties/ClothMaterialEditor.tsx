/**
 * Редактор материала ткани (Style3D KES-F-подобные параметры): выбор пресета +
 * группы числовых полей Stretch/Shear, Bending, Физические. Общий для
 * PhysicsSection (physicsMesh из newton/user_geometry) и ObjectPhysicsSection
 * (ткань из плоскости). Зеркало PhysicsMaterialProperties из shared/types/scene.ts.
 */

import { useState } from 'react';
import type { PhysicsMaterialProperties } from '@shared/types/scene';
import { MATERIAL_PRESETS, materialPropertiesFromPreset } from '@/data/materialPresets';
import { toast } from '@/store/useToastStore';

interface FieldSpec {
  key: keyof PhysicsMaterialProperties;
  label: string;
  step: number;
}

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

export function NumberField({
  label,
  value,
  onChange,
  step,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step: number;
  min?: number;
}) {
  return (
    <div>
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
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
  value,
  onFieldChange,
}: {
  title: string;
  fields: FieldSpec[];
  value: PhysicsMaterialProperties;
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
            value={value[f.key]}
            step={f.step}
            onChange={(val) => onFieldChange(f.key, val)}
          />
        ))}
      </div>
    </div>
  );
}

interface ClothMaterialEditorProps {
  value: PhysicsMaterialProperties;
  /** Вызывается с полным новым объектом — одно обновление стора (один шаг undo), в том числе для пресета. */
  onChange: (next: PhysicsMaterialProperties) => void;
  /** Дополнение к тосту после применения пресета, например «не забудьте сохранить meta.json». */
  presetHint?: string;
}

export function ClothMaterialEditor({ value, onChange, presetHint }: ClothMaterialEditorProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<number | ''>('');

  const handleField = (key: keyof PhysicsMaterialProperties, v: number) => onChange({ ...value, [key]: v });

  /**
   * Пресет применяется ОДНИМ обновлением (не по полю) — так это один шаг
   * undo-истории. Поля без аналога в пресете (m_stretch_stiffness, m_poisson_*,
   * m_bending_stiffness) не трогаются, см. materialPropertiesFromPreset().
   */
  const handleApplyPreset = () => {
    if (selectedPresetId === '') return;
    const preset = MATERIAL_PRESETS.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    onChange({ ...value, ...materialPropertiesFromPreset(preset) });
    toast.success(`Материал «${preset.name_en}» применён${presetHint ? ` — ${presetHint}` : ''}`);
  };

  return (
    <>
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

      <FieldGroup title="Stretch / Shear" fields={STRETCH_FIELDS} value={value} onFieldChange={handleField} />
      <FieldGroup title="Bending" fields={BEND_FIELDS} value={value} onFieldChange={handleField} />
      <FieldGroup title="Физические" fields={PHYSICAL_FIELDS} value={value} onFieldChange={handleField} />
    </>
  );
}
