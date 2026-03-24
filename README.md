# 3D Scene Editor

Браузерный редактор 3D-сцен — упрощённый аналог инспектора Unity для веба. Пользователи могут размещать объекты на 3D-канвасе, трансформировать их через gizmo-контролы, редактировать свойства через React UI панели и сохранять/загружать сцены через REST API.

## Стек технологий

### Frontend

- **React 18** + **TypeScript 5** — UI framework
- **Three.js** + **@react-three/fiber** + **@react-three/drei** — 3D рендеринг
- **Zustand** + **zundo** — State management с undo/redo
- **Vite** — Build tool & dev server
- **TailwindCSS** — Стилизация

### Backend

- **Node.js 20** + **Express** — REST API
- **PostgreSQL 16** — База данных
- **Prisma** — ORM
- **Docker** + **Docker Compose** — Контейнеризация

## Требования

- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose (для БД)

## Установка

1. Клонировать репозиторий:

```bash
git clone <repository-url>
cd 3d-configurator
```

2. Установить зависимости:

```bash
npm install
```

3. Скопировать `.env.example` в `.env`:

```bash
cp .env.example .env
```

4. Запустить PostgreSQL через Docker:

```bash
docker-compose up -d
```

5. Выполнить миграции базы данных:

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
cd ..
```

## Запуск

### Development mode

Запустить клиент и сервер одновременно:

```bash
npm run dev
```

Или запустить отдельно:

**Только клиент** (Vite dev server):

```bash
npm run dev:client
# или
cd client && npm run dev
```

**Только сервер** (Express API):

```bash
npm run dev:server
# или
cd server && npm run dev
```

После запуска:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/api/health

### Production build

```bash
npm run build
```

## Скрипты

```bash
# Разработка
npm run dev              # Запустить клиент и сервер
npm run dev:client       # Запустить только клиент
npm run dev:server       # Запустить только сервер

# Сборка
npm run build            # Собрать все workspace

# База данных
cd server
npx prisma migrate dev   # Создать и применить миграции
npx prisma studio        # Открыть Prisma Studio (GUI для БД)
npx prisma generate      # Сгенерировать Prisma Client

# Линтинг и форматирование
npm run lint             # Запустить ESLint
npm run format           # Форматировать код через Prettier
npm run format:check     # Проверить форматирование

# Тестирование
npm run test             # Запустить тесты (Vitest)
```

## Структура проекта

```
3d-configurator/
├── client/              # Frontend (React + Vite)
├── server/              # Backend (Express + Prisma)
├── shared/              # Общие TypeScript типы
├── docker-compose.yml   # PostgreSQL контейнер
├── Dockerfile           # Production образ для server
└── package.json         # Root workspace config
```

## Текущий статус

**✅ Этап 0: Инициализация проекта — ЗАВЕРШЁН**

Реализовано:

- ✅ Монорепо с npm workspaces (client, server, shared)
- ✅ Vite + React + TypeScript (frontend)
- ✅ Express + TypeScript (backend)
- ✅ Общие TypeScript типы
- ✅ ESLint + Prettier
- ✅ TailwindCSS
- ✅ Docker Compose (PostgreSQL)
- ✅ Dockerfile для server
- ✅ Vite proxy настроен (/api → http://localhost:3001)
- ✅ Prisma ORM настроен
- ✅ .env конфигурация

**Следующий этап:** Этап 1 — Базовая 3D-сцена

## Разработка

Проект следует поэтапному плану разработки (см. `IMPLEMENTATION_PLAN.md`). Каждый этап — это логически завершённый блок функциональности.

### Архитектура

Подробнее об архитектуре проекта см. `ARCHITECTURE.md`.

Ключевые особенности:

- **Двухслойная frontend архитектура**: Canvas layer (R3F) + UI layer (React DOM)
- **Три Zustand store**: SceneStore, EditorStore, HistoryStore
- **JSON в PostgreSQL**: Сцены хранятся как единый JSON-документ
- **Общие типы**: Типы импортируются из `shared/` как на FE, так и на BE

## Лицензия

MIT
