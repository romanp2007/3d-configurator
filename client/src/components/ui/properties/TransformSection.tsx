/**
 * Секция Transform для редактирования позиции, вращения и масштаба объекта
 */

import type { SceneObjectData } from '@shared/types/scene';

interface TransformSectionProps {
  object: SceneObjectData;
  onUpdate: (id: string, updates: Partial<SceneObjectData>) => void;
}

export function TransformSection({ object, onUpdate }: TransformSectionProps) {
  const handlePositionChange = (axis: number, value: number) => {
    const newPosition: [number, number, number] = [...object.position];
    newPosition[axis] = value;
    onUpdate(object.id, { position: newPosition });
  };

  const handleRotationChange = (axis: number, value: number) => {
    const newRotation: [number, number, number] = [...object.rotation];
    newRotation[axis] = value;
    onUpdate(object.id, { rotation: newRotation });
  };

  const handleScaleChange = (axis: number, value: number) => {
    const newScale: [number, number, number] = [...object.scale];
    newScale[axis] = value;
    onUpdate(object.id, { scale: newScale });
  };

  return (
    <div className="mb-4 pb-4 border-b border-gray-700">
      <h3 className="text-white font-medium text-sm mb-3">Transform</h3>

      {/* Position */}
      <div className="mb-3">
        <label className="block text-gray-400 text-xs mb-2">Position</label>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput
            label="X"
            value={object.position[0]}
            onChange={(val) => handlePositionChange(0, val)}
            step={0.1}
          />
          <NumberInput
            label="Y"
            value={object.position[1]}
            onChange={(val) => handlePositionChange(1, val)}
            step={0.1}
          />
          <NumberInput
            label="Z"
            value={object.position[2]}
            onChange={(val) => handlePositionChange(2, val)}
            step={0.1}
          />
        </div>
      </div>

      {/* Rotation */}
      <div className="mb-3">
        <label className="block text-gray-400 text-xs mb-2">Rotation</label>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput
            label="X"
            value={object.rotation[0]}
            onChange={(val) => handleRotationChange(0, val)}
            step={0.1}
          />
          <NumberInput
            label="Y"
            value={object.rotation[1]}
            onChange={(val) => handleRotationChange(1, val)}
            step={0.1}
          />
          <NumberInput
            label="Z"
            value={object.rotation[2]}
            onChange={(val) => handleRotationChange(2, val)}
            step={0.1}
          />
        </div>
      </div>

      {/* Scale */}
      <div>
        <label className="block text-gray-400 text-xs mb-2">Scale</label>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput
            label="X"
            value={object.scale[0]}
            onChange={(val) => handleScaleChange(0, val)}
            step={0.1}
            min={0.01}
          />
          <NumberInput
            label="Y"
            value={object.scale[1]}
            onChange={(val) => handleScaleChange(1, val)}
            step={0.1}
            min={0.01}
          />
          <NumberInput
            label="Z"
            value={object.scale[2]}
            onChange={(val) => handleScaleChange(2, val)}
            step={0.1}
            min={0.01}
          />
        </div>
      </div>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}

function NumberInput({ label, value, onChange, step = 1, min }: NumberInputProps) {
  return (
    <div>
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      <input
        type="number"
        value={value.toFixed(2)}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        className="w-full bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
      />
    </div>
  );
}
