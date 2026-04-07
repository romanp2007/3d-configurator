import { Router, Request, Response, NextFunction } from 'express';
import { CreateSceneSchema, UpdateSceneSchema } from '../schemas/scene.schemas.js';
import * as sceneService from '../services/scene.service.js';

const router = Router();

/**
 * GET /api/scenes
 * Список всех сцен (метаданные без данных объектов)
 */
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const scenes = await sceneService.listScenes();
    res.json(scenes);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/scenes/:id
 * Полные данные одной сцены
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scene = await sceneService.getScene(req.params.id);
    res.json(scene);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/scenes
 * Создание новой сцены
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateSceneSchema.parse(req.body);
    const scene = await sceneService.createScene(input);
    res.status(201).json(scene);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/scenes/:id
 * Обновление сцены (частичное — name, thumbnail, data по отдельности)
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateSceneSchema.parse(req.body);
    const scene = await sceneService.updateScene(req.params.id, input);
    res.json(scene);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/scenes/:id
 * Удаление сцены
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await sceneService.deleteScene(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
