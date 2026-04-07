# Этап 8: Backend — CRUD API для сцен

**Дата:** 2026-04-07
**Статус:** ✅ ЗАВЕРШЕНО

## Что реализовано

### server/src/lib/prisma.ts
Синглтон PrismaClient с логированием запросов в dev-режиме.

### server/src/middleware/errorHandler.ts
Централизованный обработчик ошибок Express. Обрабатывает:
- `ZodError` → 400 с перечислением ошибок полей
- `AppError` (кастомный класс) → произвольный HTTP-статус
- `Prisma.PrismaClientKnownRequestError P2025` → 404
- Всё остальное → 500

Класс `AppError` позволяет сервисному слою кидать типизированные HTTP-ошибки без прямого импорта Express.

### server/src/schemas/scene.schemas.ts
Zod-схемы для валидации входящих запросов:
- `CreateSceneSchema` — POST /api/scenes (name обязателен, data полная SceneData)
- `UpdateSceneSchema` — PUT /api/scenes/:id (все поля опциональны)

Вложенные схемы: Vec3 (tuple из 3 чисел), MaterialSchema (цвет #rrggbb, metalness/roughness 0–1), SceneObjectSchema, CameraSchema, EnvironmentSchema, SceneDataSchema.

### server/src/services/scene.service.ts
Бизнес-логика, работает с Prisma:
- `listScenes()` — список метаданных, сортировка по updatedAt desc
- `getScene(id)` — полная сцена, 404 если не найдена
- `createScene(input)` — создание, возврат полной сцены
- `updateScene(id, input)` — частичное обновление (spread только определённых полей)
- `deleteScene(id)` — удаление с проверкой существования

### server/src/routes/scenes.ts
REST-роутер Express:

| Метод  | Путь            | Действие           |
|--------|-----------------|--------------------|
| GET    | /api/scenes     | список метаданных  |
| GET    | /api/scenes/:id | полная сцена       |
| POST   | /api/scenes     | создание (201)     |
| PUT    | /api/scenes/:id | обновление         |
| DELETE | /api/scenes/:id | удаление (204)     |

Все обработчики оборачивают вызов сервиса в try/catch → next(err).

### server/src/index.ts
Подключены: `scenesRouter` на `/api/scenes`, `errorHandler` последним middleware. Лимит JSON 10mb (для thumbnail base64).

## Необходимые действия перед запуском

```bash
# Поднять PostgreSQL
docker-compose up -d

# Создать таблицы
cd server && npx prisma migrate dev --name init

# Запустить сервер
cd server && npm run dev
```

## Файлы

- [prisma.ts](../server/src/lib/prisma.ts)
- [errorHandler.ts](../server/src/middleware/errorHandler.ts)
- [scene.schemas.ts](../server/src/schemas/scene.schemas.ts)
- [scene.service.ts](../server/src/services/scene.service.ts)
- [scenes.ts](../server/src/routes/scenes.ts)
- [index.ts](../server/src/index.ts)

## Технологии

Express 4, Prisma 5, Zod 3, PostgreSQL 16, TypeScript ESM
