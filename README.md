# 3D Scene Editor

Браузерный редактор 3D-сцен — упрощённый аналог инспектора Unity для веба. Пользователи могут размещать объекты на 3D-канвасе, трансформировать их через gizmo-контролы, редактировать свойства через React UI панели, загружать текстуры и GLB-модели, а также сохранять/загружать сцены через REST API.

## Стек технологий

**Frontend:** React 18 + TypeScript 5 · Three.js + @react-three/fiber + @react-three/drei · Zustand + zundo · Vite · TailwindCSS

**Backend:** Node.js 20 + Express · PostgreSQL 16 · Prisma · Multer · Docker

## Возможности

- Добавление 3D-примитивов (куб, сфера, цилиндр, конус, плоскость, тор) через drag & drop
- Загрузка пользовательских GLB/GLTF-моделей
- Transform gizmo — перемещение, вращение, масштабирование (W/E/R)
- Редактирование материала: цвет, metalness, roughness, текстура
- Scene Hierarchy — дерево объектов с переименованием и видимостью
- Undo / Redo (Ctrl+Z / Ctrl+Shift+Z) — история 50 состояний
- Сохранение/загрузка сцен на сервер с thumbnail-превью
- Экспорт/импорт сцены в JSON
- Скриншот сцены (PNG)
- Адаптивный интерфейс: Desktop / Tablet / Mobile

## Требования

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose

## Быстрый старт (Development)

```bash
# 1. Клонировать репозиторий
git clone <repository-url>
cd 3d-configurator

# 2. Установить зависимости
npm install

# 3. Настроить переменные окружения
cp .env.example .env
cp .env.example server/.env   # Prisma читает .env из папки server/

# 4. Запустить PostgreSQL
docker-compose up -d

# 5. Применить миграции БД
cd server && npx prisma migrate dev --name init && cd ..

# 6. Запустить приложение
npm run dev
```

После запуска:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health check:** http://localhost:3001/api/health

## Production-деплой

```bash
# Собрать и запустить через Docker Compose
docker-compose -f docker-compose.prod.yml up -d --build

# Применить миграции (первый запуск)
docker exec 3d-configurator-server sh -c "cd /app && npx prisma migrate deploy"
```

Переменные окружения для production (`.env`):
```
POSTGRES_PASSWORD=<сильный_пароль>
CORS_ORIGIN=https://your-domain.com
```

## Скрипты

```bash
npm run dev              # Запустить клиент и сервер
npm run dev:client       # Только Vite dev server
npm run dev:server       # Только Express API
npm run build            # Сборка всех workspace
npm run lint             # ESLint
npm run format           # Prettier

cd server
npx prisma migrate dev   # Создать и применить миграции
npx prisma studio        # GUI для базы данных
```

## Структура проекта

```
3d-configurator/
├── client/                     # Frontend (React + Vite)
│   └── src/
│       ├── api/                # HTTP-клиенты (scenesApi, assetsApi)
│       ├── components/
│       │   ├── canvas/         # R3F компоненты (SceneView, SceneObject, ...)
│       │   └── ui/             # DOM компоненты (Toolbar, PropertiesPanel, ...)
│       ├── hooks/              # useKeyboardShortcuts, useScreenshot, ...
│       ├── store/              # Zustand stores (scene, editor, history, toast)
│       └── utils/              # sceneSerializer
├── server/                     # Backend (Express + Prisma)
│   ├── prisma/                 # schema.prisma, migrations/
│   ├── src/
│   │   ├── lib/                # prisma.ts singleton
│   │   ├── middleware/         # errorHandler
│   │   ├── routes/             # scenes.ts, assets.ts
│   │   ├── schemas/            # Zod-схемы
│   │   └── services/           # scene.service.ts
│   └── uploads/                # Загруженные файлы (текстуры, GLB)
├── shared/types/               # Общие TypeScript-типы
├── docker-compose.yml          # PostgreSQL для разработки
├── docker-compose.prod.yml     # Production (PostgreSQL + Server)
└── Dockerfile                  # Multi-stage build для server
```

## Горячие клавиши

| Клавиша | Действие |
|---------|----------|
| W | Режим перемещения |
| E | Режим вращения |
| R | Режим масштабирования |
| Ctrl+Z | Отменить |
| Ctrl+Shift+Z | Повторить |
| Ctrl+S | Сохранить сцену |
| Ctrl+O | Открыть сцену |
| Delete / Backspace | Удалить объект |
| Escape | Снять выделение |
| F1 | Справка по клавишам |

## Архитектура

Подробнее в [`CLAUDE.md`](CLAUDE.md) и [`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md).

**Ключевые особенности:**
- **Двухслойная frontend архитектура:** Canvas layer (R3F) + UI layer (React DOM) — не смешиваются
- **Три Zustand store:** SceneStore (объекты, CRUD), EditorStore (UI-состояние), HistoryStore (undo/redo через zundo)
- **JSON в PostgreSQL:** сцена хранится как единый JSON-документ в поле `data`
- **Общие типы:** `shared/types/scene.ts` импортируется и на FE, и на BE

## Лицензия

MIT
