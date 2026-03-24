# 3D Scene Editor — Implementation Plan

> Поэтапный план реализации проекта. Каждый этап — логически завершённый блок, который можно продемонстрировать.

---

## Этап 0: Инициализация проекта

**Цель:** Рабочий монорепо с пустыми приложениями, Docker, линтинг.

- [ ] Инициализировать корневой `package.json` с npm workspaces (`client`, `server`, `shared`)
- [ ] Создать `client/` — Vite + React + TypeScript
- [ ] Создать `server/` — Node.js + Express + TypeScript (ts-node-dev для hot reload)
- [ ] Создать `shared/types/` — общие TypeScript-интерфейсы
- [ ] Настроить ESLint + Prettier (единая конфигурация для всего монорепо)
- [ ] Настроить TailwindCSS в `client/`
- [ ] Создать `docker-compose.yml` (PostgreSQL + server)
- [ ] Создать `Dockerfile` для server (multi-stage build)
- [ ] Настроить `.env.example` с переменными (`DATABASE_URL`, `PORT`, `CORS_ORIGIN`)
- [ ] Настроить Vite proxy: `/api` → `http://localhost:3001`
- [ ] Проверить: `docker-compose up` поднимает БД, `npm run dev` запускает клиент и сервер

**Результат:** Пустая страница React + Express отвечает на `/api/health` + PostgreSQL работает в Docker.

---

## Этап 1: Базовая 3D-сцена

**Цель:** Отображение 3D-канваса с управлением камерой.

- [ ] Установить `@react-three/fiber`, `@react-three/drei`, `three`
- [ ] Создать `SceneView.tsx` — `<Canvas>` с базовыми настройками (shadows, антиалиасинг)
- [ ] Добавить `Grid.tsx` — сетка пола (`<gridHelper>`)
- [ ] Добавить `Lights.tsx` — ambient + directional свет
- [ ] Добавить `CameraControls.tsx` — OrbitControls (вращение, зум, панорама)
- [ ] Реализовать touch-управление в OrbitControls (мобильная поддержка)
- [ ] Создать базовый layout `App.tsx`: sidebar (250px) + canvas (flex) + properties panel (300px)
- [ ] Добавить один тестовый куб на сцену для проверки

**Результат:** Вращаемая 3D-сцена с сеткой, освещением и тестовым кубом. Работает на десктопе и мобильных.

---

## Этап 2: Zustand Store + объекты сцены

**Цель:** Управление состоянием сцены, добавление/удаление объектов.

- [ ] Определить типы в `shared/types/scene.ts` (`SceneObjectData`, `SceneData`)
- [ ] Создать `useSceneStore.ts`:
  - `objects: SceneObjectData[]`
  - `selectedId: string | null`
  - `addObject(type)`, `removeObject(id)`, `updateObject(id, patch)`
  - `selectObject(id)`, `deselectAll()`
- [ ] Создать `useEditorStore.ts`:
  - `transformMode: 'translate' | 'rotate' | 'scale'`
  - `showGrid: boolean`
  - `snapToGrid: boolean`
- [ ] Обновить `SceneView.tsx` — рендер объектов из store
- [ ] Создать `SceneObject.tsx` — рендер меша по типу (box/sphere/cylinder/cone/torus/plane)
- [ ] Реализовать выделение объекта по клику (raycasting через onClick R3F)
- [ ] Визуальная подсветка выделенного объекта (outline или wireframe)

**Результат:** Можно программно добавлять объекты, они появляются на сцене, кликом можно выделить.

---

## Этап 3: Каталог объектов + Drag & Drop

**Цель:** UI-каталог примитивов, добавление объектов на сцену перетаскиванием.

- [ ] Создать `ObjectCatalog.tsx` — сайдбар со списком примитивов (иконки/превью)
  - Box, Sphere, Cylinder, Cone, Torus, Plane, Point Light, Spot Light
- [ ] Реализовать drag & drop (react-dnd или нативный Drag API):
  - Drag из каталога
  - Drop на canvas → определение позиции через raycasting на плоскость пола
- [ ] Создать хук `useDragToScene.ts` — логика конвертации drop-координат в 3D-позицию
- [ ] Альтернативный способ: кнопка "Add" добавляет объект в центр сцены (для мобильных)
- [ ] Добавить возможность удаления объекта (клавиша Delete + кнопка в UI)

**Результат:** Пользователь перетаскивает примитив из каталога на сцену; объект появляется в точке drop.

---

## Этап 4: Transform Gizmo

**Цель:** Перемещение, вращение, масштабирование объектов через gizmo.

- [ ] Создать `TransformGizmo.tsx` — обёртка над `<TransformControls>` из drei
- [ ] Привязать gizmo к выделенному объекту
- [ ] Реализовать переключение режима gizmo (translate / rotate / scale):
  - Кнопки в `Toolbar.tsx`
  - Горячие клавиши: W — translate, E — rotate, R — scale
- [ ] Синхронизация: при перемещении через gizmo → обновление позиции в store
- [ ] Отключать OrbitControls во время работы с gizmo (предотвращение конфликтов)
- [ ] Реализовать snap-to-grid (зажатый Ctrl / переключатель в тулбаре)

**Результат:** Объекты можно двигать/вращать/масштабировать gizmo-ручками; значения синхронизируются с UI.

---

## Этап 5: Панель свойств (Properties Panel)

**Цель:** Просмотр и редактирование свойств выбранного объекта через UI.

- [ ] Создать `PropertiesPanel.tsx` — контейнер с секциями, отображается при выделении объекта
- [ ] `TransformSection.tsx`:
  - NumberInput для Position X/Y/Z, Rotation X/Y/Z, Scale X/Y/Z
  - Изменение значений → обновление store → обновление 3D-объекта
- [ ] `MaterialSection.tsx`:
  - ColorPicker для цвета
  - Слайдеры: metalness (0–1), roughness (0–1)
  - Поле для URL текстуры (загрузка позже)
- [ ] `LightSection.tsx` (для объектов-источников света):
  - Тип света (point / spot / directional)
  - Intensity, color, distance
- [ ] Поле имени объекта (редактируемое)
- [ ] Чекбоксы: visible, locked
- [ ] Двусторонняя синхронизация: изменение через gizmo обновляет числа в панели, и наоборот

**Результат:** Полноценный инспектор объекта. Изменения в UI мгновенно отражаются на 3D-сцене.

---

## Этап 6: Scene Hierarchy (дерево объектов)

**Цель:** Список всех объектов сцены с возможностью выбора, переименования, удаления.

- [ ] Создать `SceneHierarchy.tsx` — древовидный список объектов в сайдбаре
- [ ] Клик по элементу → выделение объекта на сцене
- [ ] Иконки типов объектов (куб, сфера, лампочка и т.д.)
- [ ] Контекстное меню: Rename, Duplicate, Delete
- [ ] Drag & drop для изменения порядка (опционально — группировка/parenting)
- [ ] Индикаторы: видимость (глаз), блокировка (замок)

**Результат:** Структурированный обзор всех объектов сцены с быстрым доступом к управлению.

---

## Этап 7: Undo / Redo

**Цель:** Возможность отмены и повтора любых действий.

- [ ] Установить `zundo` (temporal middleware для Zustand)
- [ ] Подключить temporal middleware к `useSceneStore`
- [ ] Реализовать кнопки Undo/Redo в `Toolbar.tsx`
- [ ] Горячие клавиши: Ctrl+Z — undo, Ctrl+Shift+Z — redo
- [ ] Отображение состояния (кнопки неактивны если нечего отменять)
- [ ] Тестирование: добавить объект → переместить → undo → undo → redo

**Результат:** Полноценная система отмены действий, как в любом редакторе.

---

## Этап 8: Backend — CRUD API для сцен

**Цель:** Сохранение и загрузка сцен через REST API.

- [ ] Настроить Prisma: `schema.prisma` с моделью `Scene`
- [ ] Запустить `prisma migrate dev` — создать таблицы в PostgreSQL
- [ ] Реализовать маршруты в `routes/scenes.ts`:
  - `GET /api/scenes` — список сцен
  - `GET /api/scenes/:id` — данные сцены
  - `POST /api/scenes` — создание
  - `PUT /api/scenes/:id` — обновление
  - `DELETE /api/scenes/:id` — удаление
- [ ] Создать `sceneService.ts` — бизнес-логика
- [ ] Создать Zod-схемы для валидации тела запросов
- [ ] Создать `errorHandler.ts` — middleware для обработки ошибок
- [ ] Тестирование API через Postman / curl

**Результат:** Полноценный REST API. Сцены сохраняются в PostgreSQL и могут быть загружены.

---

## Этап 9: Интеграция Frontend ↔ Backend

**Цель:** Сохранение/загрузка сцен из UI.

- [ ] Создать хук `useSceneApi.ts` — функции `saveScene()`, `loadScene()`, `listScenes()`, `deleteScene()`
- [ ] Создать `sceneSerializer.ts` — конвертация store state ↔ API format
- [ ] Создать `SaveLoadDialog.tsx`:
  - Список сохранённых сцен (карточки с thumbnail и датой)
  - Кнопка "Save" — сохранить текущую сцену
  - Кнопка "Save As" — сохранить как новую
  - Кнопка "Load" — загрузить выбранную
  - Кнопка "Delete" — удалить сцену (с подтверждением)
- [ ] Добавить кнопки Save / Load в `Toolbar.tsx`
- [ ] Горячие клавиши: Ctrl+S — сохранить, Ctrl+O — открыть
- [ ] Автосохранение в localStorage (fallback при отсутствии сервера)

**Результат:** Пользователь может сохранять сцены на сервер и загружать их обратно.

---

## Этап 10: Скриншот / Экспорт

**Цель:** Возможность сделать скриншот сцены или экспортировать данные.

- [ ] Реализовать `useScreenshot.ts`:
  - Получить canvas element через `gl.domElement`
  - `renderer.toDataURL('image/png')` — скриншот
- [ ] Кнопка "Screenshot" в тулбаре → скачивание PNG
- [ ] Сохранение thumbnail при сохранении сцены (отправка на сервер)
- [ ] Экспорт сцены в JSON-файл (скачивание)
- [ ] Импорт сцены из JSON-файла (загрузка через file input)

**Результат:** Пользователь может сделать скриншот сцены и экспортировать/импортировать сцену в JSON.

---

## Этап 11: Загрузка ассетов (текстуры, модели)

**Цель:** Загрузка пользовательских текстур и 3D-моделей.

- [ ] Реализовать `POST /api/assets/upload` — загрузка файлов (Multer)
- [ ] Поддержка текстур (PNG, JPG) и моделей (GLB, GLTF)
- [ ] В `MaterialSection.tsx` — кнопка загрузки текстуры, применение к объекту
- [ ] В `ObjectCatalog.tsx` — секция "Custom Models" для загруженных моделей
- [ ] Загрузчик GLB-моделей через `useGLTF` (drei)
- [ ] Валидация файлов (размер, тип) на бэкенде

**Результат:** Пользователь может загрузить свои текстуры и 3D-модели и использовать их в сцене.

---

## Этап 12: Мобильная адаптация

**Цель:** Полноценная работа на мобильных устройствах.

- [ ] Адаптивный layout:
  - Desktop: sidebar + canvas + panel (3 колонки)
  - Tablet: collapsible sidebar + canvas + collapsible panel
  - Mobile: fullscreen canvas + bottom sheet panels
- [ ] Touch-управление:
  - Pinch-to-zoom (OrbitControls поддерживает из коробки)
  - Tap для выделения объекта
  - Long press для контекстного меню
- [ ] Мобильный тулбар (нижняя панель с основными действиями)
- [ ] Тестирование на реальных устройствах / эмуляторах

**Результат:** Редактор удобно работает на мобильных устройствах с сенсорным управлением.

---

## Этап 13: Полировка и финализация

**Цель:** Доведение проекта до презентабельного состояния.

- [ ] Горячие клавиши: единый менеджер (таблица хоткеев в справке)
- [ ] Toasts / уведомления (сохранено, ошибка, загружено)
- [ ] Loading states (скелетоны для панелей, спиннер при загрузке сцены)
- [ ] Error boundaries для 3D-сцены (fallback при крэше рендера)
- [ ] Написать README.md (описание, скриншоты, инструкция запуска)
- [ ] Финальное тестирование всех фич
- [ ] Деплой: Docker Compose для production

**Результат:** Готовый, отполированный проект для портфолио / демонстрации.

---

## Summary

| Этап | Название              | Ключевые технологии                  |
| ---- | --------------------- | ------------------------------------ |
| 0    | Инициализация проекта | Vite, Express, Docker, Prisma        |
| 1    | Базовая 3D-сцена      | R3F, drei, OrbitControls             |
| 2    | Zustand Store         | Zustand, TypeScript                  |
| 3    | Каталог + Drag & Drop | react-dnd, raycasting                |
| 4    | Transform Gizmo       | TransformControls, drei              |
| 5    | Панель свойств        | React UI, двусторонняя синхронизация |
| 6    | Scene Hierarchy       | Дерево объектов                      |
| 7    | Undo / Redo           | zundo (temporal)                     |
| 8    | Backend API           | Express, Prisma, PostgreSQL          |
| 9    | Frontend ↔ Backend    | REST API, сериализация               |
| 10   | Скриншот / Экспорт    | Canvas API, JSON                     |
| 11   | Загрузка ассетов      | Multer, useGLTF                      |
| 12   | Мобильная адаптация   | Responsive, Touch                    |
| 13   | Полировка             | UX, Error handling, Deploy           |
