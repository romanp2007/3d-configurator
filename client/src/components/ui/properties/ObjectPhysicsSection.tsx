/**
 * Секция «Физика» для обычных объектов редактора (примитивы, assetMesh):
 * тип физики (none/static/rigid/cloth), коллайдер rigid-тела (mesh или
 * аналитический: box/сфера/капсула/цилиндр с автоподгонкой или ручными
 * размерами), масса, материал ткани. Объекты `physicsMesh` управляются
 * PhysicsSection (meta.json), `model` (GLB) в симуляции не участвует.
 *
 * См. wiki/plans/3d_configurator_physics_objects.md, Этап 4.
 */

import type {
  ObjectSim,
  SceneObjectData,
  SimColliderKind,
  SimColliderSettings,
  SimPhysicsType,
} from '@shared/types/scene';
import {
  allowedColliders,
  allowedPhysicsTypes,
  COLLIDER_LABELS,
  estimateRigidMass,
  getCollisionMesh,
  getSim,
  PHYSICS_TYPE_LABELS,
  resolveCollider,
} from '@/physics/objectPhysics';
import { useAssetMesh } from '@/hooks/useAssetMesh';
import { ClothMaterialEditor, NumberField } from './ClothMaterialEditor';

interface ObjectPhysicsSectionProps {
  object: SceneObjectData;
  onUpdate: (id: string, updates: Partial<SceneObjectData>) => void;
}

const SELECT_CLASS =
  'w-full bg-gray-700 text-white px-2 py-1.5 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm';

/** Предупреждение о mesh-коллайдере rigid-тела с большим числом треугольников. */
const HEAVY_TRIANGLE_COUNT = 20_000;

type Vec3 = [number, number, number];

function Vec3Fields({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: Vec3;
  step: number;
  onChange: (v: Vec3) => void;
}) {
  return (
    <div className="mb-2">
      <label className="block text-gray-500 text-xs mb-1">{label}</label>
      <div className="grid grid-cols-3 gap-2">
        {(['X', 'Y', 'Z'] as const).map((axis, i) => (
          <NumberField
            key={axis}
            label={axis}
            value={Number(value[i].toFixed(5))}
            step={step}
            onChange={(v) => {
              const next: Vec3 = [...value];
              next[i] = v;
              onChange(next);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ColliderEditor({
  object,
  sim,
  mesh,
  onSim,
}: {
  object: SceneObjectData;
  sim: ObjectSim;
  mesh: NonNullable<ReturnType<typeof getCollisionMesh>>;
  onSim: (next: ObjectSim) => void;
}) {
  const col = sim.collider;
  const setCollider = (patch: Partial<SimColliderSettings>) => onSim({ ...sim, collider: { ...col, ...patch } });

  const handleKind = (kind: SimColliderKind) => {
    // Смена вида — снова автоподгонка по мешу.
    onSim({ ...sim, collider: { kind, auto: true } });
  };

  const handleAuto = (auto: boolean) => {
    if (auto) {
      setCollider({ auto: true });
    } else {
      // «Заморозить» текущую подгонку в ручные значения, чтобы править с понятной точки.
      onSim({ ...sim, collider: { ...resolveCollider(object, mesh), auto: false } });
    }
  };

  const resolved = col.kind === 'mesh' ? null : resolveCollider(object, mesh);

  return (
    <div className="mb-3">
      <label className="block text-gray-400 text-xs mb-2">Коллайдер</label>
      <select className={SELECT_CLASS} value={col.kind} onChange={(e) => handleKind(e.target.value as SimColliderKind)}>
        {allowedColliders('rigid').map((k) => (
          <option key={k} value={k}>
            {COLLIDER_LABELS[k]}
          </option>
        ))}
      </select>

      {col.kind === 'mesh' && mesh.indices.length / 3 > HEAVY_TRIANGLE_COUNT && (
        <div className="text-xs text-amber-400 mt-1">
          {mesh.indices.length / 3} треугольников — контакты rigid-тела будут медленными; выберите
          аналитический коллайдер
        </div>
      )}

      {resolved && (
        <div className="mt-2">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer mb-2">
            <input type="checkbox" checked={col.auto} onChange={(e) => handleAuto(e.target.checked)} className="rounded" />
            <span>Подогнать по мешу автоматически</span>
          </label>

          {!col.auto && (
            <>
              <Vec3Fields
                label="Центр (локальные координаты)"
                value={resolved.center ?? [0, 0, 0]}
                step={0.01}
                onChange={(center) => setCollider({ center })}
              />
              {col.kind === 'box' && (
                <Vec3Fields
                  label="Полуразмеры"
                  value={resolved.halfExtents ?? [0.5, 0.5, 0.5]}
                  step={0.01}
                  onChange={(halfExtents) => setCollider({ halfExtents })}
                />
              )}
              {col.kind !== 'box' && (
                <div className="grid grid-cols-2 gap-2">
                  <NumberField
                    label="Радиус"
                    value={Number((resolved.radius ?? 0.5).toFixed(5))}
                    step={0.01}
                    onChange={(radius) => setCollider({ radius: Math.max(1e-3, radius) })}
                  />
                  {col.kind !== 'sphere' && (
                    <NumberField
                      label={col.kind === 'capsule' ? 'Полудлина (без колпачков)' : 'Полудлина'}
                      value={Number((resolved.halfLength ?? 0.5).toFixed(5))}
                      step={0.01}
                      onChange={(halfLength) => setCollider({ halfLength: Math.max(0, halfLength) })}
                    />
                  )}
                </div>
              )}
              {(col.kind === 'capsule' || col.kind === 'cylinder') && (
                <div className="mt-2">
                  <label className="block text-gray-500 text-xs mb-1">Ось</label>
                  <select
                    className={SELECT_CLASS}
                    value={resolved.axis ?? 1}
                    onChange={(e) => setCollider({ axis: Number(e.target.value) as 0 | 1 | 2 })}
                  >
                    <option value={0}>X</option>
                    <option value={1}>Y</option>
                    <option value={2}>Z</option>
                  </select>
                </div>
              )}
            </>
          )}
          {col.auto && (
            <div className="text-xs text-gray-500">
              Подогнанные размеры пересчитываются при смене меша/дискретизации; снимите флажок — чтобы править вручную.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ObjectPhysicsSection({ object, onUpdate }: ObjectPhysicsSectionProps) {
  const sim = getSim(object);
  // Загрузка ассета: хук нужен, чтобы секция перерисовалась, когда меш появится.
  useAssetMesh(object.type === 'assetMesh' ? object.assetMesh?.assetId : undefined);
  const mesh = getCollisionMesh(object);
  const allowed = allowedPhysicsTypes(object);
  if (allowed.length <= 1) return null; // model и т. п. — физики нет

  const setSim = (next: ObjectSim) => onUpdate(object.id, { sim: next });

  const rigid = sim.physicsType === 'rigid';
  const est = rigid && mesh ? estimateRigidMass(object, mesh) : null;

  return (
    <div className="mb-4 pb-4 border-b border-gray-700">
      <h3 className="text-white font-medium text-sm mb-3">Физика</h3>

      <div className="mb-3">
        <label className="block text-gray-400 text-xs mb-2">Тип физики</label>
        <select
          className={SELECT_CLASS}
          value={sim.physicsType}
          onChange={(e) => setSim({ ...sim, physicsType: e.target.value as SimPhysicsType })}
        >
          {allowed.map((t) => (
            <option key={t} value={t}>
              {PHYSICS_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        {object.type === 'plane' && (
          <div className="text-xs text-gray-500 mt-1">Cloth доступен только плоскости; её сетка задаётся в «Геометрии».</div>
        )}
      </div>

      {rigid && !mesh && <div className="text-xs text-gray-500">Загрузка меша…</div>}

      {rigid && mesh && (
        <>
          <ColliderEditor object={object} sim={sim} mesh={mesh} onSim={setSim} />

          <div className="mb-3">
            <label className="block text-gray-400 text-xs mb-2">Масса</label>
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Плотность [кг/м³]"
                value={sim.rigid.density}
                step={10}
                onChange={(density) => setSim({ ...sim, rigid: { ...sim.rigid, density: Math.max(0, density) } })}
              />
              <NumberField
                label="Масса явно [кг], 0 = авто"
                value={sim.rigid.mass ?? 0}
                step={0.1}
                onChange={(mass) =>
                  setSim({ ...sim, rigid: { ...sim.rigid, mass: mass > 0 ? mass : undefined } })
                }
              />
            </div>
            {est && (
              <div className="text-xs text-gray-500 mt-1">
                Объём ≈ {est.volume.toFixed(4)} м³, масса ≈ {est.mass.toFixed(2)} кг
                {est.volume <= 1e-9 && sim.rigid.mass === undefined ? ' — меш не замкнут, задайте массу явно' : ''}
              </div>
            )}
          </div>
        </>
      )}

      {sim.physicsType === 'cloth' && (
        <>
          <div className="mb-3">
            <label className="block text-gray-400 text-xs mb-2">Закрепление</label>
            <select
              className={SELECT_CLASS}
              value={sim.cloth.pinned}
              onChange={(e) => setSim({ ...sim, cloth: { ...sim.cloth, pinned: e.target.value as 'none' | 'corners' } })}
            >
              <option value="none">Не закреплять</option>
              <option value="corners">Четыре угла</option>
            </select>
          </div>
          <ClothMaterialEditor
            value={sim.cloth.materialProperties}
            onChange={(materialProperties) => setSim({ ...sim, cloth: { ...sim.cloth, materialProperties } })}
          />
        </>
      )}

      {sim.physicsType !== 'none' && (
        <div className="text-xs text-gray-500">
          Для симуляции нужен хотя бы один cloth или rigid. Пол (y = 0) всегда статический.
        </div>
      )}
    </div>
  );
}
