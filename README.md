# Web 3D Scene Editor

A browser-based 3D scene editor — a Unity-like inspector for the web. Drag primitives onto a canvas, transform them with gizmo controls, edit properties through React panels, and persist scenes via a REST API backed by PostgreSQL.

**[→ Live Demo](#)** &nbsp;·&nbsp; **[View Source](./)**

---

## Tech Stack

### Frontend

| | |
|---|---|
| Framework | React 18 · TypeScript 5 · Vite |
| 3D | Three.js · @react-three/fiber · @react-three/drei |
| State | Zustand · zundo (undo/redo) |
| Drag & Drop | react-dnd |
| Styling | TailwindCSS |

### Backend

| | |
|---|---|
| Runtime | Node.js 20 · Express · TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Infrastructure | Docker · docker-compose |

---

## Features

### Editor

- **Transform Gizmo** — translate / rotate / scale via Drei's `<TransformControls>`; OrbitControls are automatically disabled while the gizmo is active to prevent input conflicts; the final transform is synced to the store on `mouseUp`
- **Drag & Drop from catalog** — primitives (box, sphere, cylinder, cone, plane, torus) are dragged from `ObjectCatalog` onto `CanvasDropTarget` via react-dnd; drop position is converted to 3D coordinates by raycasting against the floor plane
- **GLB model upload** — any `.glb` / `.gltf` file can be uploaded to the server via `POST /api/assets` and then placed on the scene from the catalog
- **Scene Hierarchy** — a list of all scene objects with per-object selection and visibility control
- **Properties Panel** — live-editable transform (position, rotation, scale) and material (color, metalness, roughness) for the selected object; changes flow back to the Zustand store which updates the 3D object in the next frame
- **Undo / Redo** — automatic 50-step history powered by the `zundo` temporal middleware wrapping `useSceneStore`; every `set()` call is tracked with no manual snapshot management
- **Object operations** — add, duplicate (with offset), delete, lock, visibility toggle

### Persistence

- **Save / Load** — scenes are stored as a single JSON document in a PostgreSQL `Json` column via REST API; `SaveLoadDialog` renders scene thumbnails for quick identification
- **Scene thumbnail** — a canvas screenshot is captured via `useScreenshot` and saved alongside scene metadata on every save
- **JSON export / import** — local file round-trip that works without a running backend
- **Asset management** — uploaded GLB files are served through `GET /api/assets` and available for reuse across sessions

### UX

- **Keyboard shortcuts** — `W / E / R` switch gizmo mode; `Ctrl+Z / Ctrl+Shift+Z` undo/redo; `Delete` removes selected; `Escape` deselects; `Ctrl+S / Ctrl+O` open save/load dialogs; `F1` opens the hotkey reference
- **Toast notifications** — non-blocking feedback for every async operation (save, load, upload, import, error)
- **Error boundary** — `<SceneErrorBoundary>` isolates R3F/WebGL crashes from the DOM shell; the editor UI stays usable if the canvas throws
- **Responsive — three distinct layouts:**
  - **Desktop (≥ 1200px):** fixed left sidebar (catalog + hierarchy) + canvas + fixed right properties panel
  - **Tablet (768–1199px):** collapsible sidebar and properties panel with animated `width` transition
  - **Mobile (< 768px):** fullscreen canvas + bottom sheets for catalog and properties + `MobileToolbar`

---

## Architecture

### Monorepo (npm workspaces)

```
client/     # React + Vite frontend
server/     # Express REST API
shared/     # TypeScript types shared between FE and BE
```

Types are defined once in `shared/types/scene.ts` and imported in both `client/` and `server/` — no duplication, no drift between layers.

### Two-Layer Frontend

The frontend maintains a strict boundary between two rendering layers:

| Layer | Location | Notes |
|---|---|---|
| Canvas layer | `components/canvas/` | R3F components inside `<Canvas>`, managed by R3F's reconciler |
| UI layer | `components/ui/` | Standard React DOM components styled with Tailwind |

R3F and DOM components are never mixed in the same tree. All cross-layer communication goes through Zustand stores.

### State — Three Zustand Stores

| Store | Responsibility |
|---|---|
| `useSceneStore` | Objects array, CRUD, selection. Wrapped with `zundo` temporal middleware (50-step undo history) |
| `useEditorStore` | UI-only state: active gizmo mode (`translate` / `rotate` / `scale`), grid toggle, panel visibility |
| `useHistoryStore` | Exposes `undo` / `redo` consumed by keyboard shortcuts and toolbar buttons |

**Two-way sync:** gizmo drag → `updateObject` in store → Properties Panel re-renders with new values. Panel input → store `updateObject` → 3D mesh transform updates in the next frame.

### REST API

```
GET    /api/scenes          List all scenes (metadata only, no object data)
POST   /api/scenes          Create a new scene
GET    /api/scenes/:id      Full scene data (objects, camera, environment)
PUT    /api/scenes/:id      Update scene (name, thumbnail, or data independently)
DELETE /api/scenes/:id      Delete scene

POST   /api/assets          Upload a GLB/GLTF file (multipart/form-data)
GET    /api/assets          List uploaded asset files
```

All request bodies are validated with Zod schemas before reaching the service layer. Errors are handled centrally by `errorHandler` middleware.

### Database Schema

```prisma
model Scene {
  id        String   @id @default(uuid())
  name      String
  thumbnail String?  // Base64 canvas screenshot
  data      Json     // Full scene JSON: objects[], camera, environment
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## Getting Started

**Prerequisites:** Docker, Node.js ≥ 20, npm ≥ 10

```bash
# 1. Configure environment
cp .env.example .env
cp .env.example server/.env   # Prisma reads .env from server/

# 2. Start PostgreSQL
docker-compose up -d

# 3. Run database migrations
cd server && npx prisma migrate dev --name init && cd ..

# 4. Start both dev servers concurrently
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Prisma Studio | `cd server && npx prisma studio` |

```bash
npm run build           # Production build (all workspaces)
npm run lint            # ESLint across the monorepo
npm run format          # Prettier
npm run test            # Vitest
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `W` | Translate mode |
| `E` | Rotate mode |
| `R` | Scale mode |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save scene |
| `Ctrl+O` | Load scene |
| `Delete` / `Backspace` | Delete selected object |
| `Escape` | Deselect |
| `F1` | Hotkey reference |

---

## Project Structure

```
3d-configurator/
├── client/src/
│   ├── api/                  # HTTP clients (scenesApi, assetsApi)
│   ├── components/
│   │   ├── canvas/           # R3F components (SceneView, SceneObject, TransformGizmo…)
│   │   └── ui/               # DOM components (Toolbar, PropertiesPanel, ObjectCatalog…)
│   ├── hooks/                # useKeyboardShortcuts, useScreenshot, useBreakpoint
│   ├── store/                # Zustand stores (scene, editor, history, toast)
│   └── utils/                # sceneSerializer (JSON export/import)
├── server/src/
│   ├── lib/                  # Prisma singleton
│   ├── middleware/            # errorHandler
│   ├── routes/               # scenes.ts, assets.ts
│   ├── schemas/              # Zod validation schemas
│   └── services/             # scene.service.ts
├── shared/types/             # scene.ts — types shared between FE and BE
├── docker-compose.yml        # PostgreSQL for development
└── Dockerfile                # Multi-stage build for the server
```
