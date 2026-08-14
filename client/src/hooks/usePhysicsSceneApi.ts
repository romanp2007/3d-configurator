/**
 * Хук для импорта физ-сцен (newton/user_geometry) в редактор.
 * См. wiki/plans/3d_configurator_integration.md, Этап 2.
 */

import { useState, useCallback } from 'react';
import * as api from '@/api/physicsSceneApi';
import { useSceneStore } from '@/store/useSceneStore';
import { usePhysicsDebugStore } from '@/store/usePhysicsDebugStore';
import type { SceneObjectData } from '@shared/types/scene';

export function usePhysicsSceneApi() {
  const loadObjects = useSceneStore((state) => state.loadObjects);
  const setSeamCollection = usePhysicsDebugStore((state) => state.setSeamCollection);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Список сцен, доступных в newton/user_geometry на сервере wgpu_utils. */
  const listPhysicsScenes = useCallback(async (server?: string): Promise<string[]> => {
    setLoading(true);
    setError(null);
    try {
      return await api.listPhysicsScenes(server);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка загрузки списка физ-сцен';
      setError(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /** Импортирует сцену целиком в стор (заменяет текущие объекты). */
  const importPhysicsScene = useCallback(
    async (sceneName: string, server?: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const objects = await api.loadPhysicsScene(sceneName, server);
        loadObjects(objects);
        // Швы — только для просмотра (PhysicsDebugOverlay), не блокируют
        // импорт сцены при ошибке загрузки (файл может отсутствовать).
        try {
          const seamCollection = await api.loadSeamCollection(sceneName, server);
          setSeamCollection(seamCollection);
        } catch (seamErr) {
          console.warn(`[usePhysicsSceneApi] не удалось загрузить seam_collection.json для "${sceneName}":`, seamErr);
          setSeamCollection(null);
        }
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : `Ошибка загрузки сцены "${sceneName}"`;
        setError(msg);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [loadObjects, setSeamCollection],
  );

  /** Сохраняет transform + material_properties объекта обратно в meta.json. */
  const saveObjectMeta = useCallback(async (object: SceneObjectData, server?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await api.saveObjectMeta(object, server);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка сохранения meta.json';
      setError(msg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Сохраняет transform + material_properties ВСЕХ physicsMesh-объектов
   * текущей сцены редактора (не только выбранного) — по одному write-meta
   * на объект. Берёт объекты из useSceneStore напрямую (не как параметр) —
   * вызывается из мест без выделенного объекта (тулбар), см.
   * wiki/plans/3d_configurator_integration.md.
   */
  const saveAllPhysicsMeta = useCallback(async (server?: string): Promise<api.SaveAllMetaResult> => {
    setLoading(true);
    setError(null);
    try {
      const objects = useSceneStore.getState().objects;
      return await api.saveAllObjectsMeta(objects, server);
    } finally {
      setLoading(false);
    }
  }, []);

  return { listPhysicsScenes, importPhysicsScene, saveObjectMeta, saveAllPhysicsMeta, loading, error };
}
