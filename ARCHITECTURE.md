# 3D Scene Editor — Architecture & Project Structure

## 1. Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **TypeScript 5** | Type safety |
| **Three.js** + **@react-three/fiber** | 3D rendering (declarative React-обёртка над Three.js) |
| **@react-three/drei** | Готовые хелперы: TransformControls (gizmo), OrbitControls, Environment и др. |
| **Zustand** | State management (состояние сцены, undo/redo, UI) |
| **Vite** | Build tool & dev server |
| **TailwindCSS** | Utility-first стилизация UI-панелей |
| **react-dnd** | Drag & drop объектов из каталога на сцену |
| **html2canvas** / Three.js `renderer.toDataURL()` | Скриншот / экспорт сцены |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 20** + **Express** | REST API |
| **TypeScript** | Shared types between FE/BE |
| **PostgreSQL 16** | Хранение проектов (сцены, пользователи) |
| **Prisma** | ORM с типизированными запросами и миграциями |
| **Docker** + **Docker Compose** | Контейнеризация (API + DB) |
| **Multer** | Загрузка пользовательских текстур / моделей |
| **Zod** | Валидация входных данных API |

### DevOps / DX
| Technology | Purpose |
|---|---|
| **ESLint + Prettier** | Linting & formatting |
| **Vitest** | Unit-тесты |
| **GitHub Actions** (опционально) | CI pipeline |

---

## 2. Project Structure

```
3d-configurator/
├── client/                          # Frontend (React + Vite)
│   ├── public/
│   │   └── models/                  # Статичные 3D-модели (.glb/.gltf)
│   ├── src/
│   │   ├── main.tsx                 # Entry point
│   │   ├── App.tsx                  # Layout: sidebar + canvas + panels
│   │   │
│   │   ├── components/
│   │   │   ├── canvas/              # Всё, что внутри <Canvas>
│   │   │   │   ├── SceneView.tsx    # Главный Canvas-компонент (R3F)
│   │   │   │   ├── SceneObject.tsx  # Обёртка над mesh (выделение, gizmo)
│   │   │   │   ├── TransformGizmo.tsx  # TransformControls-обёртка
│   │   │   │   ├── Grid.tsx         # Сетка пола
│   │   │   │   ├── Lights.tsx       # Освещение сцены
│   │   │   │   └── CameraControls.tsx  # OrbitControls + touch
│   │   │   │
│   │   │   ├── ui/                  # React UI-панели
│   │   │   │   ├── Toolbar.tsx      # Верхняя панель (undo/redo, режим gizmo, экспорт)
│   │   │   │   ├── ObjectCatalog.tsx   # Каталог примитивов / моделей (drag source)
│   │   │   │   ├── SceneHierarchy.tsx  # Дерево объектов сцены
│   │   │   │   ├── PropertiesPanel.tsx # Инспектор свойств выделенного объекта
│   │   │   │   │   ├── TransformSection.tsx  # Position / Rotation / Scale
│   │   │   │   │   ├── MaterialSection.tsx   # Color, texture, metalness, roughness
│   │   │   │   │   └── LightSection.tsx      # Intensity, color, type
│   │   │   │   └── SaveLoadDialog.tsx  # Модалка сохранения/загрузки сцен
│   │   │   │
│   │   │   └── shared/              # Переиспользуемые UI-компоненты
│   │   │       ├── ColorPicker.tsx
│   │   │       ├── NumberInput.tsx
│   │   │       └── SliderInput.tsx
│   │   │
│   │   ├── store/                   # Zustand stores
│   │   │   ├── useSceneStore.ts     # Объекты сцены, CRUD, выделение
│   │   │   ├── useHistoryStore.ts   # Undo/redo стек (снапшоты состояния)
│   │   │   └── useEditorStore.ts    # UI-состояние (режим gizmo, панели)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useSceneApi.ts       # CRUD-запросы к backend (save/load)
│   │   │   ├── useDragToScene.ts    # Логика drop объекта на canvas
│   │   │   └── useScreenshot.ts     # Скриншот/экспорт
│   │   │
│   │   ├── types/
│   │   │   └── scene.ts             # SceneObject, Scene, Material и т.д.
│   │   │
│   │   ├── utils/
│   │   │   ├── sceneSerializer.ts   # Scene <-> JSON конвертация
│   │   │   └── idGenerator.ts       # nanoid обёртка
│   │   │
│   │   └── styles/
│   │       └── globals.css          # Tailwind base + кастомные стили
│   │
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── server/                          # Backend (Node.js + Express)
│   ├── src/
│   │   ├── index.ts                 # Entry point, Express app init
│   │   ├── routes/
│   │   │   ├── scenes.ts            # CRUD: /api/scenes
│   │   │   └── assets.ts            # Upload: /api/assets (текстуры)
│   │   ├── controllers/
│   │   │   ├── scenesController.ts
│   │   │   └── assetsController.ts
│   │   ├── services/
│   │   │   └── sceneService.ts      # Бизнес-логика работы со сценами
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   └── validate.ts          # Zod-валидация
│   │   ├── schemas/
│   │   │   └── scene.schema.ts      # Zod-схемы для API
│   │   └── utils/
│   │       └── logger.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma            # Модели: Scene, SceneObject
│   │   └── migrations/
│   │
│   ├── uploads/                     # Загруженные текстуры (volume в Docker)
│   ├── tsconfig.json
│   └── package.json
│
├── shared/                          # Общие типы FE + BE
│   └── types/
│       └── scene.ts                 # Интерфейсы SceneData, SceneObjectData
│
├── docker-compose.yml               # API + PostgreSQL
├── Dockerfile                       # Multi-stage build для server
├── .env.example
├── .gitignore
├── package.json                     # Workspace root (npm workspaces)
└── README.md
```

---

## 3. Data Model

### PostgreSQL (Prisma schema)

```prisma
model Scene {
  id          String        @id @default(uuid())
  name        String
  thumbnail   String?       // Base64 или путь к скриншоту
  data        Json          // Полный JSON сцены (объекты, камера, окружение)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt
}
```

### SceneData JSON structure (хранится в `data`)

```typescript
interface SceneData {
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  environment: {
    backgroundColor: string;
    ambientLightIntensity: number;
  };
  objects: SceneObjectData[];
}

interface SceneObjectData {
  id: string;
  name: string;
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane' | 'torus' | 'model';
  modelUrl?: string;            // Для type === 'model'
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  material: {
    color: string;
    metalness: number;
    roughness: number;
    textureUrl?: string;
  };
  visible: boolean;
  locked: boolean;
}
```

---

## 4. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/scenes` | Список всех сцен (id, name, thumbnail, updatedAt) |
| `GET` | `/api/scenes/:id` | Полные данные сцены |
| `POST` | `/api/scenes` | Создать сцену |
| `PUT` | `/api/scenes/:id` | Обновить сцену |
| `DELETE` | `/api/scenes/:id` | Удалить сцену |
| `POST` | `/api/assets/upload` | Загрузить текстуру/модель |
| `GET` | `/api/assets/:filename` | Получить загруженный файл |

---

## 5. Key Architecture Decisions

1. **@react-three/fiber вместо чистого Three.js** — декларативный подход, React-совместимый lifecycle, проще интеграция UI и 3D.

2. **Zustand с middleware `temporal`** — Undo/redo из коробки через `zundo` (temporal middleware для Zustand). Каждое действие автоматически сохраняется в историю.

3. **JSON-поле в PostgreSQL** — сцена хранится как единый JSON-документ. Проще сохранять/загружать, не нужна нормализация каждого свойства каждого объекта.

4. **npm workspaces** — монорепо с `client/`, `server/`, `shared/` пакетами. Общие типы импортируются напрямую.

5. **Docker Compose** — `docker-compose up` поднимает API + PostgreSQL. Фронтенд работает через Vite dev server с proxy на API.
