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

### [Этап 10: Скриншот и экспорт](2026-04-07-stage-10-screenshot-export.md) (2026-04-07) - ✅ ЗАВЕРШЕНО

Реализован скриншот сцены (preserveDrawingBuffer + toDataURL через useImperativeHandle внутри Canvas). Кнопки в Toolbar: 📷 скриншот PNG, ⬇ JSON экспорт, ⬆ JSON импорт через file input. При сохранении сцены thumbnail автоматически передаётся на сервер, в диалоге загрузки отображается превью.

📄 **[Подробное описание →](2026-04-07-stage-10-screenshot-export.md)**

**Основные файлы:**
[useScreenshot.ts](../client/src/hooks/useScreenshot.ts), [SceneView.tsx](../client/src/components/canvas/SceneView.tsx), [sceneSerializer.ts](../client/src/utils/sceneSerializer.ts), [Toolbar.tsx](../client/src/components/ui/Toolbar.tsx)

**Технологии:** WebGL preserveDrawingBuffer, canvas.toDataURL, useImperativeHandle, FileReader, Blob

---

### [Этап 9: Интеграция Frontend ↔ Backend](2026-04-07-stage-9-frontend-backend.md) (2026-04-07) - ✅ ЗАВЕРШЕНО

Реализована полная интеграция UI с REST API. Создан HTTP-клиент scenesApi.ts, сериализатор store↔SceneData, хук useSceneApi (loading/error, save/load/list/delete). SaveLoadDialog — модальный диалог с двумя режимами (сохранить/загрузить), inline-удаление с подтверждением. Кнопки в Toolbar и горячие клавиши Ctrl+S / Ctrl+O.

📄 **[Подробное описание →](2026-04-07-stage-9-frontend-backend.md)**

**Основные файлы:**
[scenesApi.ts](../client/src/api/scenesApi.ts), [useSceneApi.ts](../client/src/hooks/useSceneApi.ts), [SaveLoadDialog.tsx](../client/src/components/ui/SaveLoadDialog.tsx), [sceneSerializer.ts](../client/src/utils/sceneSerializer.ts), [App.tsx](../client/src/App.tsx)

**Технологии:** fetch API, React hooks, Zustand loadObjects, Vite proxy

---

### [Этап 8: Backend — CRUD API для сцен](2026-04-07-stage-8-backend-api.md) (2026-04-07) - ✅ ЗАВЕРШЕНО

Реализован полный REST API для управления сценами. Создан синглтон PrismaClient, централизованный errorHandler (ZodError→400, AppError→custom, P2025→404), Zod-схемы валидации (CreateScene/UpdateScene с вложенными Vec3/Material/SceneData), сервисный слой с CRUD-операциями и Express-роутер (GET list, GET by id, POST 201, PUT, DELETE 204). index.ts обновлён: подключены роутер и errorHandler, лимит JSON 10mb для base64 thumbnail.

📄 **[Подробное описание →](2026-04-07-stage-8-backend-api.md)**

**Основные файлы:**
[prisma.ts](../server/src/lib/prisma.ts), [errorHandler.ts](../server/src/middleware/errorHandler.ts), [scene.schemas.ts](../server/src/schemas/scene.schemas.ts), [scene.service.ts](../server/src/services/scene.service.ts), [scenes.ts](../server/src/routes/scenes.ts), [index.ts](../server/src/index.ts)

**Технологии:** Express 4, Prisma 5, Zod 3, PostgreSQL 16, TypeScript ESM

---

### [Этап 7: Undo / Redo](2026-04-07-stage-7-undo-redo.md) (2026-04-07) - ✅ ЗАВЕРШЕНО

zundo temporal middleware подключён к useSceneStore — все мутации автоматически пишутся в историю (лимит 50). Создан useHistoryStore с canUndo/canRedo флагами. Кнопки Undo/Redo в Toolbar с disabled-состоянием. Горячие клавиши Ctrl+Z / Ctrl+Shift+Z.

📄 **[Подробное описание →](2026-04-07-stage-7-undo-redo.md)**

**Основные файлы:**
[useSceneStore.ts](../client/src/store/useSceneStore.ts), [useHistoryStore.ts](../client/src/store/useHistoryStore.ts), [Toolbar.tsx](../client/src/components/ui/Toolbar.tsx), [useKeyboardShortcuts.ts](../client/src/hooks/useKeyboardShortcuts.ts)

**Технологии:** zundo 2.3.0, Zustand temporal middleware, keyboard event listener

---

### [Этап 6: Scene Hierarchy](2026-04-07-stage-6-scene-hierarchy.md) (2026-04-07) - ✅ ЗАВЕРШЕНО

Создан SceneHierarchy — список объектов сцены в левом сайдбаре. Клик выделяет объект, двойной клик — инлайн-rename. Hover-действия: toggle видимости, дублировать, удалить. Иконки по типу объекта, счётчик, пустое состояние.

📄 **[Подробное описание →](2026-04-07-stage-6-scene-hierarchy.md)**

**Основные файлы:**
[SceneHierarchy.tsx](../client/src/components/ui/SceneHierarchy.tsx)

**Технологии:** Zustand useSceneStore, controlled input, conditional rendering

---

### [Этап 5: Панель свойств](2026-04-07-stage-5-properties-panel.md) (2026-04-07) - ✅ ЗАВЕРШЕНО

Создан PropertiesPanel с секциями TransformSection (Position/Rotation/Scale, шаг 0.1) и MaterialSection (color picker, metalness/roughness слайдеры). Редактируемое имя объекта, чекбокс visible. Двусторонняя синхронизация: гизмо → store → поля панели и обратно.

📄 **[Подробное описание →](2026-04-07-stage-5-properties-panel.md)**

**Основные файлы:**
[PropertiesPanel.tsx](../client/src/components/ui/PropertiesPanel.tsx), [TransformSection.tsx](../client/src/components/ui/properties/TransformSection.tsx), [MaterialSection.tsx](../client/src/components/ui/properties/MaterialSection.tsx)

**Технологии:** React controlled inputs, Zustand updateObject, двусторонняя синхронизация

---

### [Этап 4: Transform Gizmo](2026-03-26-stage-4-transform-gizmo.md) (2026-03-26) - ✅ ЗАВЕРШЕНО

Реализовано интерактивное гизмо для манипуляции объектами с тремя режимами трансформации (перемещение, вращение, масштабирование). Создан компонент TransformGizmo — обёртка над TransformControls из drei с синхронизацией в Zustand store. Добавлен Toolbar для переключения режимов и горячие клавиши W/E/R. Решены проблемы бесконечного цикла обновлений и двойной трансформации. OrbitControls автоматически отключается во время взаимодействия с гизмо.

📄 **[Подробное описание →](2026-03-26-stage-4-transform-gizmo.md)**

**Основные файлы:**
[TransformGizmo.tsx](../client/src/components/canvas/TransformGizmo.tsx), [Toolbar.tsx](../client/src/components/ui/Toolbar.tsx), [useKeyboardShortcuts.ts](../client/src/hooks/useKeyboardShortcuts.ts), [CameraControls.tsx](../client/src/components/canvas/CameraControls.tsx), [SceneView.tsx](../client/src/components/canvas/SceneView.tsx)

**Технологии:** @react-three/drei TransformControls, Three.js events (mouseDown/mouseUp), Zustand store sync, conditional rendering

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
