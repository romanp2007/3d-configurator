# Changelog Index

**ВАЖНО:** Новые записи добавляются В НАЧАЛО этого файла (не в конец!)

**ФОРМАТ ЗАПИСЕЙ:**

- Для крупных изменений (>15 строк описания): создать отдельный файл `YYYY-MM-DD-название.md` с подробным описанием
- В INDEX.md оставить краткое описание (2-3 предложения) + ссылку на файл
- Формат краткой записи:

  ```
  ### [Название](файл.md) (время) - статус

    Краткое описание (2-3 предложения): суть проблемы/изменения + результат.

    📄 **[Подробное описание →](файл.md)**

    **Файлы:** [файл1](путь), [файл2](путь)

    **Статус:** ✅ ЗАВЕРШЕНО (опционально)
  ```

---

### [Этап 3: Drag & Drop + Каталог объектов](2026-03-24-stage-3-drag-drop.md) (2026-03-24) - ✅ ЗАВЕРШЕНО

Реализован визуальный каталог объектов с drag & drop функциональностью. Установлены react-dnd зависимости, создан ObjectCatalog с Unicode иконками и draggable элементами, CanvasDropTarget для обработки drop на canvas. Добавлена поддержка горячих клавиш: Delete/Backspace (удаление объекта), Escape (снятие выделения). Объекты перетаскиваются из каталога и появляются на сцене в случайной позиции рядом с центром. Визуальная обратная связь при drag (полупрозрачность, подсветка canvas).

📄 **[Подробное описание →](2026-03-24-stage-3-drag-drop.md)**

**Основные файлы:**
[ObjectCatalog.tsx](../client/src/components/ui/ObjectCatalog.tsx), [CanvasDropTarget.tsx](../client/src/components/ui/CanvasDropTarget.tsx), [useKeyboardShortcuts.ts](../client/src/hooks/useKeyboardShortcuts.ts), [App.tsx](../client/src/App.tsx), [useSceneStore.ts](../client/src/store/useSceneStore.ts)

**Технологии:** react-dnd, react-dnd-html5-backend, DndProvider, useDrag, useDrop, keyboard events

---

### [Этап 2: Zustand Store + объекты сцены](2026-03-24-stage-2-zustand-store.md) (2026-03-24) - ✅ ЗАВЕРШЕНО

Реализовано управление состоянием через Zustand. Созданы два store: useSceneStore (управление объектами, CRUD, выделение) и useEditorStore (UI-состояние). Реализован компонент SceneObject для рендеринга 6 типов геометрии (box, sphere, cylinder, cone, plane, torus). Добавлен функциональный UI для добавления/удаления объектов, выделение по клику с визуальной подсветкой (emissive), список объектов в сайдбаре, переключатель видимости сетки.

📄 **[Подробное описание →](2026-03-24-stage-2-zustand-store.md)**

**Основные файлы:**
[useSceneStore.ts](../client/src/store/useSceneStore.ts), [useEditorStore.ts](../client/src/store/useEditorStore.ts), [SceneObject.tsx](../client/src/components/canvas/SceneObject.tsx), [SceneView.tsx](../client/src/components/canvas/SceneView.tsx), [App.tsx](../client/src/App.tsx)

**Технологии:** Zustand, nanoid, React Three Fiber raycasting, emissive materials

---

### [Этап 1: Базовая 3D-сцена](2026-03-24-stage-1-basic-3d-scene.md) (2026-03-24) - ✅ ЗАВЕРШЕНО

Реализована рабочая 3D-сцена с управлением камерой. Установлены Three.js зависимости (с учетом совместимости React 18), созданы компоненты для отображения 3D-канваса, освещения, сетки пола и управления камерой (OrbitControls с touch-поддержкой). Настроен трёхколоночный layout приложения (каталог объектов / 3D Canvas / панель свойств). Исправлена проблема с блокировкой localhost через конфигурацию Vite.

📄 **[Подробное описание →](2026-03-24-stage-1-basic-3d-scene.md)**

**Основные файлы:**
[SceneView.tsx](../client/src/components/canvas/SceneView.tsx), [Grid.tsx](../client/src/components/canvas/Grid.tsx), [Lights.tsx](../client/src/components/canvas/Lights.tsx), [CameraControls.tsx](../client/src/components/canvas/CameraControls.tsx), [App.tsx](../client/src/App.tsx), [vite.config.ts](../client/vite.config.ts)

**Технологии:** Three.js 0.160.0, @react-three/fiber 8.15.0, @react-three/drei 9.96.0, React Three Fiber, OrbitControls

---

### [Этап 0: Инициализация проекта](2026-03-24-stage-0-init.md) (2026-03-24) - ✅ ЗАВЕРШЕНО

Выполнена полная инициализация монорепо-проекта 3D Scene Editor. Создана базовая инфраструктура: настроены workspaces (client/server/shared), Vite + React + TypeScript для frontend, Express + Prisma для backend, ESLint + Prettier, TailwindCSS, Docker Compose с PostgreSQL, общие типы для сцен, документация. Проект готов к разработке основного функционала.

📄 **[Подробное описание →](2026-03-24-stage-0-init.md)**

**Основные файлы:**
[package.json](../package.json), [client/](../client/), [server/](../server/), [shared/](../shared/), [docker-compose.yml](../docker-compose.yml), [README.md](../README.md), [CLAUDE.md](../CLAUDE.md)

**Технологии:** React 18, TypeScript 5, Vite, Express, Prisma, PostgreSQL 16, Docker, TailwindCSS, ESLint, Prettier

---
