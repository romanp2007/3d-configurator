/**
 * Панель инструментов для управления режимами трансформации и историей
 */

import { useRef, useState } from 'react';
import { useEditorStore, type TransformMode } from '@/store/useEditorStore';
import { useHistoryStore } from '@/store/useHistoryStore';
import { useSceneStore } from '@/store/useSceneStore';
import { usePhysicsSceneApi } from '@/hooks/usePhysicsSceneApi';
import { getStoredPhysicsServer } from '@/api/physicsSceneApi';
import { toast } from '@/store/useToastStore';

interface ToolbarProps {
  onSave: () => void;
  onLoad: () => void;
  onScreenshot: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onImportPhysicsScene: () => void;
  onHotkeys: () => void;
}

export function Toolbar({
  onSave,
  onLoad,
  onScreenshot,
  onExportJson,
  onImportJson,
  onImportPhysicsScene,
  onHotkeys,
}: ToolbarProps) {
  const transformMode = useEditorStore((state) => state.transformMode);
  const setTransformMode = useEditorStore((state) => state.setTransformMode);
  const simMode = useEditorStore((state) => state.simMode);
  const startSimulation = useEditorStore((state) => state.startSimulation);
  const pauseSimulation = useEditorStore((state) => state.pauseSimulation);
  const resumeSimulation = useEditorStore((state) => state.resumeSimulation);
  const stopSimulation = useEditorStore((state) => state.stopSimulation);
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  // 'simulate' И 'paused' — GPU-ресурсы солвера живы (см. useEditorStore.ts,
  // SimMode), редактирование сцены запрещено в обоих случаях одинаково.
  const isSimulating = simMode !== 'edit';

  const objects = useSceneStore((state) => state.objects);
  const hasPhysicsObjects = objects.some((o) => o.type === 'physicsMesh');
  const { saveAllPhysicsMeta, loading: physicsSaving } = usePhysicsSceneApi();
  const [savingAll, setSavingAll] = useState(false);

  const handleSaveAllPhysicsMeta = async () => {
    setSavingAll(true);
    const { saved, failed } = await saveAllPhysicsMeta(getStoredPhysicsServer());
    setSavingAll(false);
    if (failed.length === 0) {
      toast.success(`meta.json сохранён для ${saved.length} объект(ов)`);
    } else if (saved.length === 0) {
      toast.error(`Не удалось сохранить ни одного объекта (см. консоль)`);
      console.error('[Toolbar] saveAllPhysicsMeta failures:', failed);
    } else {
      toast.error(`Сохранено ${saved.length}, ошибок ${failed.length} (см. консоль)`);
      console.error('[Toolbar] saveAllPhysicsMeta failures:', failed);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const modes: { mode: TransformMode; label: string; key: string }[] = [
    { mode: 'translate', label: 'Перемещение', key: 'W' },
    { mode: 'rotate', label: 'Вращение', key: 'E' },
    { mode: 'scale', label: 'Масштаб', key: 'R' },
  ];

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="flex gap-2 bg-gray-800/90 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-700">
        {/* Симуляция: edit → Симуляция (свежий старт) / simulate → Пауза
            (солвер и GPU-ресурсы остаются, просто не шагаем) / paused →
            Продолжить (resume того же солвера, без пересборки). См.
            SimMode в useEditorStore.ts. */}
        <button
          onClick={
            simMode === 'edit' ? startSimulation : simMode === 'simulate' ? pauseSimulation : resumeSimulation
          }
          className={`px-3 py-2 rounded transition-colors ${
            simMode === 'simulate'
              ? 'bg-amber-700 text-white hover:bg-amber-600'
              : 'bg-green-700 text-white hover:bg-green-600'
          }`}
          title={
            simMode === 'edit'
              ? 'Запустить симуляцию (Style3D GPU-солвер, только physicsMesh-объекты)'
              : simMode === 'simulate'
                ? 'Пауза — солвер остаётся в памяти, можно продолжить с той же точки'
                : 'Продолжить симуляцию с той же точки'
          }
        >
          <span className="text-sm font-medium">
            {simMode === 'edit' ? '▶ Симуляция' : simMode === 'simulate' ? '⏸ Пауза' : '▶ Продолжить'}
          </span>
        </button>

        {/* Стоп — полная остановка: PhysicsSimController уничтожает
            GPU-ресурсы и сбрасывает геометрию к rest-позе. Видна и во время
            симуляции, и на паузе. */}
        {isSimulating && (
          <button
            onClick={stopSimulation}
            className="px-3 py-2 rounded bg-red-700 text-white hover:bg-red-600 transition-colors"
            title="Остановить симуляцию и сбросить позы к исходным"
          >
            <span className="text-sm font-medium">⏹ Стоп</span>
          </button>
        )}

        {/* Reset — стоп + сразу заново, с текущего состояния сцены. Между
            stopSimulation() и startSimulation() нужна пауза: без неё React
            может смержить оба set() в одно обновление simMode и пропустить
            промежуточный эффект уничтожения GPU-ресурсов в
            PhysicsSimController (activeRef так и останется указывать на
            старую, уже "потерянную" симуляцию). */}
        {isSimulating && (
          <button
            onClick={() => {
              stopSimulation();
              setTimeout(() => startSimulation(), 50);
            }}
            className="px-3 py-2 rounded bg-amber-700 text-white hover:bg-amber-600 transition-colors"
            title="Остановить и запустить симуляцию заново с текущего состояния сцены"
          >
            <span className="text-sm font-medium">↺ Reset</span>
          </button>
        )}

        {/* Разделитель */}
        <div className="w-px bg-gray-600 mx-1" />

        {/* Undo/Redo кнопки */}
        <button
          onClick={() => undo()}
          disabled={!canUndo || isSimulating}
          className={`px-3 py-2 rounded transition-colors ${
            canUndo && !isSimulating
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          title="Отменить (Ctrl+Z)"
        >
          <span className="text-sm font-medium">↶ Undo</span>
        </button>

        <button
          onClick={() => redo()}
          disabled={!canRedo || isSimulating}
          className={`px-3 py-2 rounded transition-colors ${
            canRedo && !isSimulating
              ? 'bg-gray-700 text-white hover:bg-gray-600'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
          }`}
          title="Повторить (Ctrl+Shift+Z)"
        >
          <span className="text-sm font-medium">↷ Redo</span>
        </button>

        {/* Разделитель */}
        <div className="w-px bg-gray-600 mx-1" />

        {/* Save / Load */}
        <button
          onClick={onSave}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Сохранить сцену (Ctrl+S)"
        >
          <span className="text-sm font-medium">💾 Сохранить</span>
        </button>
        <button
          onClick={onLoad}
          disabled={isSimulating}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Загрузить сцену (Ctrl+O)"
        >
          <span className="text-sm font-medium">📂 Загрузить</span>
        </button>

        {/* Разделитель */}
        <div className="w-px bg-gray-600 mx-1" />

        {/* Screenshot */}
        <button
          onClick={onScreenshot}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Скриншот сцены"
        >
          <span className="text-sm font-medium">📷</span>
        </button>

        {/* Экспорт JSON */}
        <button
          onClick={onExportJson}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Экспорт сцены в JSON"
        >
          <span className="text-sm font-medium">⬇ JSON</span>
        </button>

        {/* Импорт JSON */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Импорт сцены из JSON"
        >
          <span className="text-sm font-medium">⬆ JSON</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onImportJson(file);
            // Сбросить value чтобы можно было загрузить тот же файл повторно
            e.target.value = '';
          }}
        />

        {/* Импорт физ-сцены (newton/user_geometry, через wgpu_utils/server) —
            открывает PhysicsSceneDialog (выбор сервера + сцены из списка). */}
        <button
          onClick={onImportPhysicsScene}
          disabled={isSimulating}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          title="Импорт физ-сцены из newton/user_geometry (dev)"
        >
          <span className="text-sm font-medium">🧵 Физ-сцена</span>
        </button>

        {/* Сохранить meta.json ВСЕХ physicsMesh-объектов сцены разом (transform +
            material_properties) — в отличие от кнопки «💾 meta.json» в PhysicsSection,
            которая сохраняет только выбранный объект. См. wiki/plans/
            3d_configurator_integration.md. */}
        {hasPhysicsObjects && (
          <button
            onClick={handleSaveAllPhysicsMeta}
            disabled={isSimulating || savingAll || physicsSaving}
            className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
            title="Сохранить transform + material_properties всех физ-объектов сцены в meta.json"
          >
            <span className="text-sm font-medium">{savingAll ? '…' : '💾 Физ-сцена'}</span>
          </button>
        )}

        {/* Справка */}
        <button
          onClick={onHotkeys}
          className="px-3 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          title="Горячие клавиши (F1)"
        >
          <span className="text-sm font-medium">?</span>
        </button>

        {/* Разделитель */}
        <div className="w-px bg-gray-600 mx-1" />

        {/* Режимы трансформации */}
        {modes.map(({ mode, label, key }) => (
          <button
            key={mode}
            onClick={() => setTransformMode(mode)}
            className={`px-4 py-2 rounded transition-colors ${
              transformMode === mode
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={`${label} (${key})`}
          >
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs ml-2 opacity-70">{key}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
