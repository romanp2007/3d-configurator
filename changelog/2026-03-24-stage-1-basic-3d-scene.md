# Этап 1: Базовая 3D-сцена (2026-03-24)

## Статус: ✅ ЗАВЕРШЕНО

## Описание

Реализована базовая 3D-сцена с управлением камерой. Установлены Three.js зависимости, созданы компоненты для отображения 3D-канваса, освещения, сетки пола и управления камерой. Настроен layout приложения с тремя колонками.

## Цель этапа

Создать рабочую 3D-сцену с управлением камерой, освещением и базовым layout для дальнейшей разработки.

## Выполненные задачи

### 1. Установка Three.js зависимостей

```bash
npm install three@^0.160.0 @react-three/fiber@^8.15.0 @react-three/drei@^9.96.0 --workspace=client
```

**Установленные пакеты:**

- `three@^0.160.0` - библиотека 3D графики
- `@react-three/fiber@^8.15.0` - React renderer для Three.js (совместим с React 18)
- `@react-three/drei@^9.96.0` - набор готовых компонентов и хелперов
- `@types/three` - TypeScript типы

### 2. Компоненты Canvas Layer

#### Grid.tsx

Компонент сетки пола для ориентации в 3D-пространстве.

```typescript
// client/src/components/canvas/Grid.tsx
- Размер сетки: 20×20
- Цвета: 0x444444 (основные линии), 0x222222 (вспомогательные)
```

#### Lights.tsx

Компонент освещения сцены с тремя источниками света.

```typescript
// client/src/components/canvas/Lights.tsx
- ambientLight: фоновое освещение (intensity: 0.5)
- directionalLight: направленный свет с тенями (position: [10, 10, 5], intensity: 1)
  - shadow-mapSize: 2048×2048
  - shadow-camera настройки для корректных теней
- hemisphereLight: заполняющий свет снизу (intensity: 0.3)
```

#### CameraControls.tsx

Управление камерой через OrbitControls с полной поддержкой touch-устройств.

```typescript
// client/src/components/canvas/CameraControls.tsx
- minDistance: 2, maxDistance: 50
- maxPolarAngle: Math.PI / 2 (ограничение вращения по вертикали)
- enableDamping: плавное затухание
- dampingFactor: 0.05
- Touch-поддержка включена по умолчанию
- Скорости: rotate (0.5), zoom (0.8), pan (0.5)
```

#### SceneView.tsx

Главный компонент 3D-сцены, объединяющий все элементы.

```typescript
// client/src/components/canvas/SceneView.tsx
- Canvas с shadows и antialiasing
- Камера: position [5, 5, 5], fov 50
- Фон: #1a1a1a (темный)
- Тестовый синий куб (1×1×1) с тенями
- Плоскость пола (20×20) для приема теней
```

### 3. Обновленный Layout

#### App.tsx

Трёхколоночный layout с полной высотой экрана.

**Структура:**

- **Левый сайдбар** (w-64 / 256px): Object Catalog (placeholder)
- **Центр** (flex-1): 3D Canvas
- **Правая панель** (w-80 / 320px): Properties Panel (placeholder)

**Особенности:**

- `h-screen` - полная высота экрана
- `overflow-hidden` - предотвращает скролл
- Темная тема: bg-gray-900, gray-800, gray-700
- Borders между секциями

### 4. Настройка Vite

#### Исправление проблемы с localhost

Добавлено в `client/vite.config.ts`:

```typescript
server: {
  port: 5173,
  host: '0.0.0.0', // Разрешает подключения со всех интерфейсов
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
    },
  },
}
```

**Проблема:** Браузер блокировал `localhost` (blocked:origin)
**Решение:** `host: '0.0.0.0'` позволяет Vite слушать все сетевые интерфейсы

## Технические детали

### React Three Fiber

R3F использует декларативный подход для работы с Three.js:

```tsx
<mesh castShadow receiveShadow position={[0, 0.5, 0]}>
  <boxGeometry args={[1, 1, 1]} />
  <meshStandardMaterial color="#4a9eff" />
</mesh>
```

### Тени

Тени настроены на уровне Canvas и отдельных мешей:

- `Canvas shadows` - глобальное включение теней
- `castShadow` - объект отбрасывает тени
- `receiveShadow` - объект принимает тени
- `directionalLight` настроен с shadow-map 2048×2048

### Touch-поддержка

OrbitControls из drei автоматически поддерживает:

- **Один палец** - вращение камеры
- **Два пальца** - зум (pinch) и панорама
- **Damping** - плавность движения

## Созданные файлы

```
client/src/
├── App.tsx (обновлён)
└── components/
    └── canvas/
        ├── SceneView.tsx
        ├── Grid.tsx
        ├── Lights.tsx
        └── CameraControls.tsx
```

## Проверка работоспособности

### TypeScript

```bash
cd client && npx tsc --noEmit  # ✅ Без ошибок
```

### Форматирование

```bash
npm run format  # ✅ Применено
```

### Запуск

```bash
npm run dev:client
# Открыть http://localhost:5173 или http://127.0.0.1:5173
```

## Управление камерой

**Desktop:**

- **ЛКМ + движение** - вращение камеры вокруг сцены
- **Колесо мыши** - зум in/out
- **ПКМ + движение** - панорама (перемещение камеры)

**Touch (мобильные):**

- **1 палец** - вращение
- **2 пальца (pinch)** - зум
- **2 пальца (swipe)** - панорама

## Результат

✅ Рабочая 3D-сцена с:

- Синим кубом в центре
- Сеткой пола для ориентации
- Трёхточечным освещением
- Тенями от объектов
- Плавным управлением камерой
- Touch-поддержкой
- Готовым layout для дальнейшей разработки

## Следующий этап

**Этап 2: Zustand Store + объекты сцены**

Задачи:

- Установить Zustand
- Создать `useSceneStore` для управления объектами
- Создать `useEditorStore` для UI-состояния
- Реализовать CRUD операции с объектами
- Добавить выделение объектов по клику
- Визуальная подсветка выбранного объекта

## Заметки

- Three.js версия 0.160.0 совместима с @react-three/fiber@8.15.0
- R3F 9.x требовал React 19, поэтому использована версия 8.x
- `host: '0.0.0.0'` в vite.config.ts необходим для работы на некоторых системах
- Touch-управление работает из коробки без дополнительной настройки

## Затраченное время

Этап 1: ~30 минут (установка зависимостей + создание компонентов)

## Автор

Claude Code (Sonnet 4.5)
