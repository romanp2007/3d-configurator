/**
 * HTTP-клиент для работы с API сцен
 * Все запросы идут через Vite proxy: /api → http://localhost:3001
 */

import type { Scene, SceneMetadata, SceneData } from '@shared/types/scene';

const BASE = '/api/scenes';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  // DELETE возвращает 204 без тела
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/** Список всех сцен (метаданные) */
export function listScenes(): Promise<SceneMetadata[]> {
  return request<SceneMetadata[]>(BASE);
}

/** Получить полную сцену по id */
export function getScene(id: string): Promise<Scene> {
  return request<Scene>(`${BASE}/${id}`);
}

/** Создать новую сцену */
export function createScene(payload: {
  name: string;
  thumbnail?: string;
  data: SceneData;
}): Promise<Scene> {
  return request<Scene>(BASE, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/** Обновить существующую сцену */
export function updateScene(
  id: string,
  payload: { name?: string; thumbnail?: string; data?: SceneData },
): Promise<Scene> {
  return request<Scene>(`${BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/** Удалить сцену */
export function deleteScene(id: string): Promise<void> {
  return request<void>(`${BASE}/${id}`, { method: 'DELETE' });
}
