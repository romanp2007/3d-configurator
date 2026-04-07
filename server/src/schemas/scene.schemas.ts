import { z } from 'zod';

// --- Вложенные схемы ---

const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);

const MaterialSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Цвет должен быть в формате #rrggbb'),
  metalness: z.number().min(0).max(1),
  roughness: z.number().min(0).max(1),
  textureUrl: z.string().url().optional(),
});

const ObjectTypeSchema = z.enum(['box', 'sphere', 'cylinder', 'cone', 'plane', 'torus', 'model']);

const SceneObjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: ObjectTypeSchema,
  modelUrl: z.string().optional(),
  position: Vec3Schema,
  rotation: Vec3Schema,
  scale: Vec3Schema,
  material: MaterialSchema,
  visible: z.boolean(),
  locked: z.boolean(),
});

const CameraSchema = z.object({
  position: Vec3Schema,
  target: Vec3Schema,
});

const EnvironmentSchema = z.object({
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ambientLightIntensity: z.number().min(0),
});

const SceneDataSchema = z.object({
  camera: CameraSchema,
  environment: EnvironmentSchema,
  objects: z.array(SceneObjectSchema),
});

// --- Схемы запросов ---

/**
 * POST /api/scenes — создание сцены
 */
export const CreateSceneSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(100),
  thumbnail: z.string().optional(),
  data: SceneDataSchema,
});

/**
 * PUT /api/scenes/:id — обновление сцены
 */
export const UpdateSceneSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  thumbnail: z.string().optional(),
  data: SceneDataSchema.optional(),
});

export type CreateSceneInput = z.infer<typeof CreateSceneSchema>;
export type UpdateSceneInput = z.infer<typeof UpdateSceneSchema>;
