# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based 3D scene editor — a simplified Unity-like inspector for the web. Users drag objects onto a 3D canvas, transform them via gizmo controls, edit properties through React UI panels, and save/load scenes via a REST API.

**Stack:** React 18 + TypeScript 5 + Three.js (@react-three/fiber + @react-three/drei) + Zustand + Vite + TailwindCSS | Node.js 20 + Express + Prisma + PostgreSQL 16 + Docker

## Architecture

### Monorepo Structure (npm workspaces)

- `client/` — React + Vite frontend
- `server/` — Express REST API
- `shared/` — TypeScript types shared between FE and BE

### Two-Layer Frontend Architecture

The frontend has two distinct rendering layers that must stay synchronized:

1. **Canvas layer** (`components/canvas/`) — R3F components running inside `<Canvas>`. These are Three.js objects managed by React Three Fiber's reconciler, not DOM elements.
2. **UI layer** (`components/ui/`) — Standard React DOM components (toolbar, panels, catalog) styled with TailwindCSS.

**Critical:** R3F components and DOM components cannot be mixed in the same tree. Canvas components must be children of `<Canvas>`, UI components live outside it.

### State Management

Three Zustand stores with distinct responsibilities:

- **useSceneStore** — Scene objects array, CRUD operations, selection state. Uses `zundo` temporal middleware for automatic undo/redo history.
- **useEditorStore** — UI-only state: current gizmo mode (translate/rotate/scale), panel visibility, grid/snap toggles.
- **useHistoryStore** — Undo/redo stack management.

Two-way sync pattern: gizmo manipulation → store update → UI panel reflects new values, and vice versa (panel input → store → 3D object transforms).

### Data Model

Scenes are stored as a single JSON document in PostgreSQL's `Json` field (not normalized per-object). The `SceneData` structure contains camera state, environment settings, and a flat array of `SceneObjectData` entries. Types are defined in `shared/types/scene.ts`.

Object types: `box | sphere | cylinder | cone | plane | torus | model`

### API

REST endpoints under `/api/scenes` (CRUD) and `/api/assets` (file upload/download). Vite dev server proxies `/api` to the Express backend. Zod schemas validate all request bodies.

## Commands

Project is in planning phase — commands will be established during Stage 0 initialization. Planned:

```bash
# Development
docker-compose up                  # Start PostgreSQL + API
npm run dev                        # Start both client and server dev servers
cd client && npm run dev           # Vite dev server (frontend only)
cd server && npm run dev           # ts-node-dev (backend only)

# Database
cd server && npx prisma migrate dev    # Run migrations
cd server && npx prisma studio         # Visual DB browser

# Testing
npm run test                       # Vitest

# Linting
npm run lint                       # ESLint
npm run format                     # Prettier
```

## Implementation Stages

The project follows a 14-stage plan (see IMPLEMENTATION_PLAN.md). Stages 0–7 are frontend-focused, stages 8–9 integrate backend, stages 10–13 add polish. Each stage is a self-contained deliverable.

## Key Libraries & Patterns

- **@react-three/fiber** — Declarative Three.js in React. Use JSX for meshes, lights, controls. Event handlers (onClick, onPointerOver) work via raycasting.
- **@react-three/drei** — Use `TransformControls` for gizmo, `OrbitControls` for camera, `useGLTF` for model loading.
- **Zustand + zundo** — Every scene mutation is automatically tracked for undo/redo. No manual snapshot management needed.
- **react-dnd** — Drag from ObjectCatalog, drop onto canvas. Drop position converted to 3D coordinates via raycasting against floor plane.
- **nanoid** — ID generation for scene objects.

## Conventions

- Documentation and comments in the codebase are in Russian.
- Shared types between FE/BE must be defined in `shared/types/` and imported from there — never duplicate type definitions.
- Disable OrbitControls when TransformControls (gizmo) is active to prevent input conflicts.
