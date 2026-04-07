import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateSceneInput, UpdateSceneInput } from '../schemas/scene.schemas.js';
import type { Scene, SceneMetadata } from '../../../shared/types/scene.js';

/**
 * Преобразует запись Prisma в формат SceneMetadata (без данных сцены)
 */
function toMetadata(record: {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: Date;
  updatedAt: Date;
}): SceneMetadata {
  return {
    id: record.id,
    name: record.name,
    thumbnail: record.thumbnail ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Список всех сцен (только метаданные, без data)
 */
export async function listScenes(): Promise<SceneMetadata[]> {
  const scenes = await prisma.scene.findMany({
    select: { id: true, name: true, thumbnail: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
  });
  return scenes.map(toMetadata);
}

/**
 * Получить сцену по id (полные данные)
 */
export async function getScene(id: string): Promise<Scene> {
  const scene = await prisma.scene.findUnique({ where: { id } });
  if (!scene) throw new AppError(404, 'Сцена не найдена');
  return {
    ...toMetadata(scene),
    data: scene.data as Scene['data'],
  };
}

/**
 * Создать новую сцену
 */
export async function createScene(input: CreateSceneInput): Promise<Scene> {
  const scene = await prisma.scene.create({
    data: {
      name: input.name,
      thumbnail: input.thumbnail ?? null,
      data: input.data as object,
    },
  });
  return {
    ...toMetadata(scene),
    data: scene.data as Scene['data'],
  };
}

/**
 * Обновить существующую сцену
 */
export async function updateScene(id: string, input: UpdateSceneInput): Promise<Scene> {
  const existing = await prisma.scene.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Сцена не найдена');

  const scene = await prisma.scene.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.thumbnail !== undefined && { thumbnail: input.thumbnail }),
      ...(input.data !== undefined && { data: input.data as object }),
    },
  });
  return {
    ...toMetadata(scene),
    data: scene.data as Scene['data'],
  };
}

/**
 * Удалить сцену
 */
export async function deleteScene(id: string): Promise<void> {
  const existing = await prisma.scene.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'Сцена не найдена');
  await prisma.scene.delete({ where: { id } });
}
