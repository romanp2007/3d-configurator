/**
 * Диалог импорта физ-сцены из newton/user_geometry (через wgpu_utils/server).
 * Заменяет prompt()-based триггер, см. wiki/plans/3d_configurator_integration.md.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePhysicsSceneApi } from '@/hooks/usePhysicsSceneApi';
import { getStoredPhysicsServer, setStoredPhysicsServer } from '@/api/physicsSceneApi';
import { toast } from '@/store/useToastStore';

interface PhysicsSceneDialogProps {
  onClose: () => void;
}

export function PhysicsSceneDialog({ onClose }: PhysicsSceneDialogProps) {
  const { listPhysicsScenes, importPhysicsScene, loading } = usePhysicsSceneApi();

  const [server, setServer] = useState(getStoredPhysicsServer);
  const [scenes, setScenes] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    setListError(null);
    const list = await listPhysicsScenes(server);
    setScenes(list);
    if (list.length === 0) {
      setListError(`Сцены не найдены на ${server} (сервер не запущен или newton/user_geometry пуст)`);
    }
  }, [listPhysicsScenes, server]);

  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleServerChange = (value: string) => {
    setServer(value);
    setStoredPhysicsServer(value);
  };

  const handleImport = async () => {
    if (!selected) return;
    const ok = await importPhysicsScene(selected, server);
    if (ok) {
      toast.success(`Физ-сцена "${selected}" импортирована`);
      onClose();
    } else {
      toast.error(`Не удалось импортировать "${selected}" — см. консоль`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Импорт физ-сцены</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Сервер (wgpu_utils/server)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={server}
                onChange={(e) => handleServerChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && refreshList()}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={refreshList}
                disabled={loading}
                className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded transition-colors"
                title="Обновить список сцен"
              >
                ⟳
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm text-gray-400 mb-2">
              Сцены в newton/user_geometry ({scenes.length})
            </div>
            {loading && scenes.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-6">Загрузка...</div>
            ) : listError ? (
              <div className="text-amber-400 text-xs text-center py-6 px-2">{listError}</div>
            ) : (
              <div className="space-y-1">
                {scenes.map((name) => (
                  <div
                    key={name}
                    onClick={() => setSelected(name)}
                    onDoubleClick={handleImport}
                    className={`px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                      selected === name
                        ? 'bg-blue-600/30 border border-blue-500 text-white'
                        : 'bg-gray-700/50 border border-transparent hover:bg-gray-700 text-gray-200'
                    }`}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleImport}
            disabled={loading || !selected}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            {loading ? 'Импорт...' : 'Импортировать'}
          </button>
        </div>
      </div>
    </div>
  );
}
