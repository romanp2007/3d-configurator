/**
 * Хук для работы с API сцен: сохранение, загрузка, список, удаление
 */

import { useState, useCallback } from 'react';
import * as api from '@/api/scenesApi';
import { serializeScene, deserializeScene } from '@/utils/sceneSerializer';
import { useSceneStore } from '@/store/useSceneStore';
import type { SceneMetadata } from '@shared/types/scene';

export function useSceneApi() {
  const objects = useSceneStore((state) => state.objects);
  const loadObjects = useSceneStore((state) => state.loadObjects);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Список всех сохранённых сцен */
  const listScenes = useCallback(async (): Promise<SceneMetadata[]> => {
    setLoading(true);
    setError(null);
    try {
      return await api.listScenes();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка загрузки списка';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /** Сохранить текущую сцену (создать новую) */
  const saveScene = useCallback(
    async (name: string, thumbnail?: string): Promise<SceneMetadata | null> => {
      setLoading(true);
      setError(null);
      try {
        const scene = await api.createScene({ name, thumbnail, data: serializeScene(objects) });
        return scene;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Ошибка сохранения';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [objects],
  );

  /** Обновить существующую сцену */
  const updateScene = useCallback(
    async (id: string): Promise<SceneMetadata | null> => {
      setLoading(true);
      setError(null);
      try {
        const scene = await api.updateScene(id, { data: serializeScene(objects) });
        return scene;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Ошибка обновления';
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [objects],
  );

  /** Загрузить сцену по id в store */
  const loadScene = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const scene = await api.getScene(id);
        loadObjects(deserializeScene(scene.data));
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Ошибка загрузки';
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadObjects],
  );

  /** Удалить сцену */
  const deleteScene = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteScene(id);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка удаления';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { listScenes, saveScene, updateScene, loadScene, deleteScene, loading, error };
}
