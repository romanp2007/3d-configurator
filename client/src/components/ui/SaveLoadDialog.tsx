/**
 * Диалог сохранения и загрузки сцен
 */

import { useState, useEffect, useCallback } from 'react';
import { useSceneApi } from '@/hooks/useSceneApi';
import type { SceneMetadata } from '@shared/types/scene';

type DialogMode = 'save' | 'load';

interface SaveLoadDialogProps {
  mode: DialogMode;
  onClose: () => void;
  /** Функция для получения base64 thumbnail текущей сцены */
  getThumbnail?: () => string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SaveLoadDialog({ mode, onClose, getThumbnail }: SaveLoadDialogProps) {
  const { listScenes, saveScene, loadScene, deleteScene, loading, error } = useSceneApi();

  const [scenes, setScenes] = useState<SceneMetadata[]>([]);
  const [saveName, setSaveName] = useState('Новая сцена');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const refreshList = useCallback(async () => {
    const list = await listScenes();
    setScenes(list);
  }, [listScenes]);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  async function handleSave() {
    const thumbnail = getThumbnail?.() ?? undefined;
    const result = await saveScene(saveName.trim() || 'Без названия', thumbnail);
    if (result) {
      setSuccessMsg(`Сцена «${result.name}» сохранена`);
      await refreshList();
    }
  }

  async function handleLoad() {
    if (!selectedId) return;
    const ok = await loadScene(selectedId);
    if (ok) onClose();
  }

  async function handleDelete(id: string) {
    const ok = await deleteScene(id);
    if (ok) {
      if (selectedId === id) setSelectedId(null);
      setConfirmDeleteId(null);
      await refreshList();
    }
  }

  // Закрытие по Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    /* Оверлей */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col">
        {/* Шапка */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">
            {mode === 'save' ? 'Сохранить сцену' : 'Загрузить сцену'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Тело */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Поле имени (только в режиме save) */}
          {mode === 'save' && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Название</label>
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                autoFocus
              />
            </div>
          )}

          {/* Успех */}
          {successMsg && (
            <div className="text-green-400 text-sm bg-green-900/30 border border-green-800 rounded px-3 py-2">
              {successMsg}
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="text-red-400 text-sm bg-red-900/30 border border-red-800 rounded px-3 py-2">
              {error}
            </div>
          )}

          {/* Список сцен */}
          <div>
            <div className="text-sm text-gray-400 mb-2">
              Сохранённые сцены ({scenes.length})
            </div>
            {loading && scenes.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-6">Загрузка...</div>
            ) : scenes.length === 0 ? (
              <div className="text-gray-500 text-sm text-center py-6">Нет сохранённых сцен</div>
            ) : (
              <div className="space-y-1">
                {scenes.map((scene) => (
                  <div
                    key={scene.id}
                    onClick={() => setSelectedId(scene.id)}
                    className={`flex items-center gap-3 justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedId === scene.id
                        ? 'bg-blue-600/30 border border-blue-500'
                        : 'bg-gray-700/50 border border-transparent hover:bg-gray-700'
                    }`}
                  >
                    {/* Thumbnail */}
                    {scene.thumbnail ? (
                      <img
                        src={scene.thumbnail}
                        alt=""
                        className="w-14 h-10 rounded object-cover flex-shrink-0 bg-gray-900"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded flex-shrink-0 bg-gray-900 flex items-center justify-center text-gray-600 text-xs">
                        3D
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm font-medium truncate">{scene.name}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {formatDate(scene.updatedAt)}
                      </div>
                    </div>

                    {/* Удаление */}
                    <div className="ml-3 flex-shrink-0">
                      {confirmDeleteId === scene.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(scene.id);
                            }}
                            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
                          >
                            Да
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 text-white rounded"
                          >
                            Нет
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(scene.id);
                          }}
                          className="text-gray-500 hover:text-red-400 transition-colors text-sm px-1"
                          title="Удалить"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Подвал с кнопками */}
        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Отмена
          </button>

          {mode === 'save' ? (
            <button
              onClick={handleSave}
              disabled={loading || !saveName.trim()}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              {loading ? 'Сохранение...' : 'Сохранить'}
            </button>
          ) : (
            <button
              onClick={handleLoad}
              disabled={loading || !selectedId}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              {loading ? 'Загрузка...' : 'Загрузить'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
