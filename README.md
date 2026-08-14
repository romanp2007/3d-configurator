# Web 3D Scene Editor

A browser-based 3D scene editor — a Unity-like inspector for the web. Drag primitives onto a canvas, transform them with gizmo controls, edit properties through React panels, and persist scenes via a REST API backed by PostgreSQL.

It also doubles as a **front-end for the [`wgpu_utils`](../) Style3D cloth solver**: import a physics scene (mannequin + garment panels) from `newton/user_geometry`, move/rotate/scale panels, edit their material parameters, save changes back to disk, and run the GPU cloth simulation live in the same viewport.

**[→ Live Demo](#)** &nbsp;·&nbsp; **[View Source](./)**

---

## Tech Stack

### Frontend

| | |
|---|---|
| Framework | React 19 · TypeScript 6 · Vite |
| 3D | `three` (WebGPU renderer) · @react-three/fiber v9 · @react-three/drei v10 |
| State | Zustand · zundo (undo/redo) |
| Drag & Drop | react-dnd |
| Styling | TailwindCSS |
| Physics | GPU Style3D solver, imported directly from `../src` in the sibling [`wgpu_utils`](../) repo (`@wgpu/*` alias — not an npm package, both repos live side by side on disk) |

### Backend

| | |
|---|---|
| Runtime | Node.js 20 · Express · TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Infrastructure | Docker · docker-compose |

Physics scenes are **not** stored through this backend — they're read from and written back to `wgpu_utils/newton/user_geometry/` on disk, via a small set of endpoints on `wgpu_utils`'s own Next.js dev server (see [Physics Scenes](#physics-scenes-style3d) below).

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

### Physics Scenes (Style3D)

- **Import** — the toolbar's "🧵 Физ-сцена" button opens `PhysicsSceneDialog`, which lists scenes available on a `wgpu_utils/server` instance (`GET /api/scene/list`) and imports one (`GET /api/scene/read`) as regular scene objects (`type: 'physicsMesh'`). Geometry is kept in **local (rest) space**; the object's `position/rotation/scale` carry the same transform Style3D authored it with — so the existing gizmo, undo/redo, and Properties Panel all work on physics objects with zero special-casing. Source data is Z-up (Style3D convention); a derived rotation-conjugation in `zUpToYUp.ts` converts it to the app's Y-up world once at import and back on save.
- **`PhysicsSection`** — a Properties Panel section (shown only for `physicsMesh` objects) exposing every KES-F-style material field from `meta.json` (`material_properties`: stretch/shear, bending, density/thickness/friction) plus `ortho_stiffness`/`damping`, all live-editable.
- **Save to disk** — the panel's "💾 meta.json" button writes the object's current transform and material fields back to `newton/user_geometry/{scene}/{uuid}/meta.json` (`POST /api/scene/write-meta`, allow-listed fields only — geometry and seam topology are never touched).
- **Debug overlay** — checkboxes in `PhysicsSection` toggle a read-only view of seam stitches (red lines between the two edges a garment seam will pull together) and pinned/fixed vertices (yellow points), resolved from `seam_collection.json` / `fixed_points.json` against the current object transforms.
- **Simulate** — the toolbar's "▶ Симуляция" button spins up a `Style3DSolverScene` (its own `GpuContext`, independent of the display's `WebGPURenderer`) from the current scene state and steps it every frame; results are written directly into each cloth mesh's `BufferGeometry` position attribute (a "vertex morph", bypassing the Zustand store so simulation frames never pollute undo history). "⏹ Стоп" tears the solver down and resets geometry to rest pose; "↺ Reset" does both in sequence to restart from the current scene state.

> Physics scenes require a running `wgpu_utils/server` (see [Getting Started](#getting-started)). Without it, the rest of the editor works normally — this is an optional layer on top of the base scene editor.

### Persistence

- **Save / Load** — scenes are stored as a single JSON document in a PostgreSQL `Json` column via REST API; `SaveLoadDialog` renders scene thumbnails for quick identification
- **Scene thumbnail** — a canvas screenshot is captured via `useScreenshot` and saved alongside scene metadata on every save
- **JSON export / import** — local file round-trip that works without a running backend
- **Asset management** — uploaded GLB files are served through `GET /api/assets` and available for reuse across sessions

> Physics scenes (`physicsMesh` objects) go through the separate `write-meta` path above, not this JSON-blob save — a scene containing physics objects saved here would not round-trip their large typed-array geometry.

### UX

- **Keyboard shortcuts** — `W / E / R` switch gizmo mode; `Ctrl+Z / Ctrl+Shift+Z` undo/redo; `Delete` removes selected; `Escape` deselects; `Ctrl+S / Ctrl+O` open save/load dialogs; `F1` opens the hotkey reference
- **Toast notifications** — non-blocking feedback for every async operation (save, load, upload, import, error)
- **Error boundary** — `<SceneErrorBoundary>` isolates R3F/WebGPU crashes from the DOM shell; the editor UI stays usable if the canvas throws
- **Responsive — three distinct layouts:**
  - **Desktop (≥ 1200px):** fixed left sidebar (catalog + hierarchy) + canvas + fixed right properties panel
  - **Tablet (768–1199px):** collapsible sidebar and properties panel with animated `width` transition
  - **Mobile (< 768px):** fullscreen canvas + bottom sheets for catalog and properties + `MobileToolbar`

---

## Architecture

### Monorepo (npm workspaces) + a sibling repo

```
wgpu_utils/                 # sibling repo — GPU Style3D cloth solver (WebGPU/WGSL)
  src/                      # imported directly by the client via the @wgpu/* alias
  server/                   # Next.js file server for newton/user_geometry scenes
  newton/user_geometry/     # physics scene data on disk (meta.json, vertices.bin, ...)

3d-configurator/
  client/     # React + Vite frontend
  server/     # Express REST API (regular scenes + asset uploads only)
  shared/     # TypeScript types shared between FE and BE
```

Types are defined once in `shared/types/scene.ts` and imported in both `client/` and `server/` — no duplication, no drift between layers. `client/vite.config.ts` aliases `@wgpu` to `../../src` (in `wgpu_utils`) and ships a small custom Vite plugin so `.wgsl` shader imports resolve the same way they do in `wgpu_utils`'s own webpack build (`asset/source`, i.e. raw string).

### Two-Layer Frontend

The frontend maintains a strict boundary between two rendering layers:

| Layer | Location | Notes |
|---|---|---|
| Canvas layer | `components/canvas/` | R3F components inside `<Canvas>`, managed by R3F's reconciler |
| UI layer | `components/ui/` | Standard React DOM components styled with Tailwind |

R3F and DOM components are never mixed in the same tree. All cross-layer communication goes through Zustand stores — **except** the physics simulation loop, which writes result positions directly into Three.js geometry via `physicsGeometryRegistry` (a plain `Map`, not a store) specifically so 60fps solver frames don't touch React state or the undo history.

`SceneView.tsx`'s `<Canvas>` uses `THREE.WebGPURenderer` (async-initialized, per R3F v9's `gl={async (props) => ...}` support) rather than the default WebGL2 renderer — it falls back to WebGL2 automatically if no WebGPU adapter is available.

### State — Zustand Stores

| Store | Responsibility |
|---|---|
| `useSceneStore` | Objects array, CRUD, selection. Wrapped with `zundo` temporal middleware (50-step undo history) |
| `useEditorStore` | UI-only state: active gizmo mode (`translate` / `rotate` / `scale`), grid toggle, panel visibility, and `simMode` (`'edit'` / `'simulate'`) |
| `useHistoryStore` | Exposes `undo` / `redo` consumed by keyboard shortcuts and toolbar buttons |
| `usePhysicsDebugStore` | Loaded `seam_collection.json` + debug-overlay visibility toggles. Kept out of `useSceneStore` on purpose — it's scene-level, read-only, and must not enter undo history or scene JSON export |

**Two-way sync:** gizmo drag → `updateObject` in store → Properties Panel re-renders with new values. Panel input → store `updateObject` → 3D mesh transform updates in the next frame. This applies to `physicsMesh` objects too, unmodified.

### REST API (regular scenes + assets)

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

### Physics scene API (served by `wgpu_utils/server`, not this one)

```
GET  /api/scene/list                          List scene names under newton/user_geometry
GET  /api/scene/read?scene=...&path=...        Read a scene file (meta.json / *.bin / seam_collection.json / fixed_points.json)
POST /api/scene/write-meta                     Patch a single object's meta.json (allow-listed fields only)
```

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
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| Prisma Studio | `cd server && npx prisma studio` |

```bash
npm run build           # Production build (all workspaces)
npm run lint            # ESLint across the monorepo
npm run format          # Prettier
npm run test            # Vitest
```

### Physics scenes (optional)

To use the "🧵 Физ-сцена" import / save-to-disk / simulate features, also start `wgpu_utils`'s own file server **on a different port** (it defaults to 3000, which collides with the frontend above):

```bash
cd ../server && npx next dev -p 3010
```

`PhysicsSceneDialog` defaults to `http://localhost:3010` and remembers whatever address you type in `localStorage`.

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

Physics-specific actions (import, save meta.json, simulate/stop/reset) are toolbar-button-only for now — no dedicated shortcuts yet.

---

## Project Structure

```
3d-configurator/
├── client/src/
│   ├── api/                  # HTTP clients: scenesApi, assetsApi (this repo's backend),
│   │                         # physicsSceneApi (wgpu_utils/server: list/read/write-meta,
│   │                         # seam_collection.json)
│   ├── components/
│   │   ├── canvas/           # R3F components: SceneView, SceneObject, TransformGizmo,
│   │   │                     # PhysicsSimController (runs Style3DSolverScene),
│   │   │                     # PhysicsDebugOverlay (seams/fixed-points view)
│   │   └── ui/                # DOM components: Toolbar, PropertiesPanel, ObjectCatalog,
│   │       │                  # PhysicsSceneDialog (scene picker)
│   │       └── properties/    # TransformSection, MaterialSection, PhysicsSection
│   ├── hooks/                 # useKeyboardShortcuts, useScreenshot, useBreakpoint,
│   │                          # usePhysicsSceneApi (import/save physics scenes)
│   ├── physics/                # buildSceneSimInputFromEditor (store → SceneSimInput
│   │                            # for the wgpu_utils solver), physicsGeometryRegistry
│   ├── store/                  # Zustand stores: scene, editor, history, toast,
│   │                            # usePhysicsDebugStore
│   └── utils/                  # sceneSerializer (JSON export/import), zUpToYUp
│                                # (Style3D Z-up ↔ editor Y-up conversion)
├── server/src/
│   ├── lib/                  # Prisma singleton
│   ├── middleware/            # errorHandler
│   ├── routes/               # scenes.ts, assets.ts
│   ├── schemas/              # Zod validation schemas
│   └── services/             # scene.service.ts
├── shared/types/             # scene.ts — types shared between FE and BE, including
│                              # PhysicsMeshData/PhysicsMaterialProperties
├── docker-compose.yml        # PostgreSQL for development
└── Dockerfile                # Multi-stage build for the server
```

See [`wiki/plans/3d_configurator_integration.md`](../wiki/plans/3d_configurator_integration.md) and [`wiki/changelog/3d_configurator_integration.md`](../wiki/changelog/3d_configurator_integration.md) in the `wgpu_utils` repo for the full design rationale and implementation log of the physics-scene integration.
