/**
 * Панель настроек GPU-солвера (Style3DSolverConfig) — см.
 * usePhysicsEngineSettingsStore.ts. Применяются при следующем старте
 * симуляции (▶ Симуляция / ↺ Reset), не влияют на уже запущенный солвер.
 */

import { useEffect } from 'react';
import {
  usePhysicsEngineSettingsStore,
  type PhysicsEngineSettings,
} from '@/store/usePhysicsEngineSettingsStore';

interface PhysicsEngineSettingsDialogProps {
  onClose: () => void;
}

interface FieldSpec {
  key: keyof PhysicsEngineSettings;
  label: string;
  step: number;
}

const STEPPING_FIELDS: FieldSpec[] = [
  { key: 'dt', label: 'dt [с]', step: 0.001 },
  { key: 'numSubsteps', label: 'Подшагов', step: 1 },
  { key: 'numNewtonIters', label: 'Newton-итераций', step: 1 },
  { key: 'numPcgIters', label: 'PCG-итераций', step: 1 },
];

const CONTACT_PT_FIELDS: FieldSpec[] = [
  { key: 'contactFixedStiffness', label: 'Fixed stiffness', step: 100 },
  { key: 'contactDamping', label: 'Damping', step: 1e-6 },
  { key: 'contactStiffFactor', label: 'Stiff factor', step: 0.01 },
  { key: 'contactHessReg', label: 'Hess reg', step: 1e-10 },
];

const CONTACT_EE_FIELDS: FieldSpec[] = [
  { key: 'contactFixedStiffnessEe', label: 'Fixed stiffness (EE)', step: 100 },
  { key: 'contactDampingEe', label: 'Damping (EE)', step: 1e-6 },
  { key: 'contactStiffFactorEe', label: 'Stiff factor (EE)', step: 0.01 },
  { key: 'contactHessRegEe', label: 'Hess reg (EE)', step: 1e-10 },
];

const DAMPING_FIELDS: FieldSpec[] = [
  { key: 'stretchDamping', label: 'Stretch damping', step: 1e-14 },
  { key: 'bendDamping', label: 'Bend damping', step: 1e-14 },
];

const SEAMING_FIELDS: FieldSpec[] = [
  { key: 'adjustFactor', label: 'Adjust factor', step: 1 },
  { key: 'seamStiffness', label: 'Seam stiffness', step: 100 },
  { key: 'seamMergeDistance', label: 'Seam merge dist [м]', step: 0.001 },
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
  settings,
  onFieldChange,
}: {
  title: string;
  fields: FieldSpec[];
  settings: PhysicsEngineSettings;
  onFieldChange: (key: keyof PhysicsEngineSettings, value: number) => void;
}) {
  return (
    <div className="mb-4">
      <label className="block text-gray-400 text-xs mb-2">{title}</label>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <NumberField
            key={f.key}
            label={f.label}
            value={settings[f.key]}
            step={f.step}
            onChange={(val) => onFieldChange(f.key, val)}
          />
        ))}
      </div>
    </div>
  );
}

export function PhysicsEngineSettingsDialog({ onClose }: PhysicsEngineSettingsDialogProps) {
  const settings = usePhysicsEngineSettingsStore((s) => s.settings);
  const setField = usePhysicsEngineSettingsStore((s) => s.setField);
  const resetToDefaults = usePhysicsEngineSettingsStore((s) => s.resetToDefaults);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Настройки физического движка</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-xs text-amber-400/80 mb-4">
            Применяются при следующем запуске симуляции («▶ Симуляция» или «↺ Reset») — на уже
            идущую симуляцию не влияют.
          </p>

          <FieldGroup title="Шаг интегрирования" fields={STEPPING_FIELDS} settings={settings} onFieldChange={setField} />
          <FieldGroup title="Контакты PT (вершина–треугольник)" fields={CONTACT_PT_FIELDS} settings={settings} onFieldChange={setField} />
          <FieldGroup title="Контакты EE (ребро–ребро)" fields={CONTACT_EE_FIELDS} settings={settings} onFieldChange={setField} />
          <FieldGroup title="Демпфирование материала" fields={DAMPING_FIELDS} settings={settings} onFieldChange={setField} />
          <FieldGroup title="Швы / stiffness ramp-up" fields={SEAMING_FIELDS} settings={settings} onFieldChange={setField} />
        </div>

        <div className="px-6 py-4 border-t border-gray-700 flex justify-between gap-3">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            title="Вернуть все поля к значениям по умолчанию"
          >
            ↺ Сбросить
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
