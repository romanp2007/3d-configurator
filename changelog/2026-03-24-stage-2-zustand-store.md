# Этап 2: Zustand Store + объекты сцены (2026-03-24)

## Статус: ✅ ЗАВЕРШЕНО

## Описание

Реализовано управление состоянием сцены через Zustand. Созданы два store: `useSceneStore` для объектов сцены и `useEditorStore` для UI-состояния. Реализованы CRUD операции с объектами, выделение по клику и визуальная подсветка. Добавлен тестовый UI для добавления и удаления объектов.

## Цель этапа

Создать систему управления состоянием сцены с возможностью добавления, удаления и выделения объектов. Реализовать рендеринг различных типов геометрии (box, sphere, cylinder, cone, plane, torus).

## Выполненные задачи

### 1. Установка зависимостей

```bash
npm install zustand nanoid --workspace=client
```

**Установленные пакеты:**

- `zustand` — легковесное state management решение для React
- `nanoid` — генератор уникальных ID (для идентификаторов объектов)

### 2. Store для сцены (useSceneStore)

#### useSceneStore.ts

Zustand store для управления объектами сцены с полным набором CRUD операций.

```typescript
// client/src/store/useSceneStore.ts

interface SceneStore {
  objects: SceneObjectData[]; // Массив всех объектов сцены
  selectedId: string | null; // ID выбранного объекта

  // CRUD операции
  addObject: (type: ObjectType) => void;
  removeObject: (id: string) => void;
  updateObject: (id: string, patch: Partial<SceneObjectData>) => void;

  // Управление выделением
  selectObject: (id: string) => void;
  deselectAll: () => void;
}
```

**Особенности реализации:**

- **createDefaultObject** — функция создания объекта с дефолтными значениями:
  - Генерация ID через `nanoid()`
  - Локализованные имена объектов (Куб, Сфера, и т.д.)
  - Позиция по умолчанию: `[0, 0.5, 0]`
  - Материал: синий цвет, metalness 0.3, roughness 0.7
  - Все объекты видимы и разблокированы по умолчанию

- **addObject** — добавляет новый объект в массив
- **removeObject** — удаляет объект по ID, автоматически снимает выделение если объект был выбран
- **updateObject** — частичное обновление объекта (используется для transform и свойств)
- **selectObject / deselectAll** — управление выделением

### 3. Store для UI-состояния (useEditorStore)

#### useEditorStore.ts

Store для состояния редактора (не зависит от объектов сцены).

```typescript
// client/src/store/useEditorStore.ts

export type TransformMode = 'translate' | 'rotate' | 'scale';

interface EditorStore {
  transformMode: TransformMode; // Режим gizmo (будет использован на Этапе 4)
  showGrid: boolean; // Видимость сетки пола
  snapToGrid: boolean; // Привязка к сетке (будет использована позже)

  setTransformMode: (mode: TransformMode) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
}
```

**Начальное состояние:**

- `transformMode: 'translate'`
- `showGrid: true`
- `snapToGrid: false`

### 4. Компонент объекта (SceneObject.tsx)

#### SceneObject.tsx

Универсальный компонент для рендеринга объектов разных типов.

```typescript
// client/src/components/canvas/SceneObject.tsx

interface SceneObjectProps {
  data: SceneObjectData; // Данные объекта
  isSelected: boolean; // Флаг выделения
  onClick: (event: ThreeEvent<MouseEvent>) => void; // Обработчик клика
}
```

**Поддерживаемые типы геометрии:**

| Тип      | Геометрия                   | Параметры                   |
| -------- | --------------------------- | --------------------------- |
| box      | `<boxGeometry>`             | 1×1×1                       |
| sphere   | `<sphereGeometry>`          | radius 0.5, 32 сегментов    |
| cylinder | `<cylinderGeometry>`        | radius 0.5, height 1        |
| cone     | `<coneGeometry>`            | radius 0.5, height 1        |
| plane    | `<planeGeometry>`           | 1×1, double-sided           |
| torus    | `<torusGeometry>`           | radius 0.5, tube 0.2        |
| model    | Placeholder (wireframe box) | Для будущей реализации GLTF |

**Визуальная подсветка выделенных объектов:**

```typescript
const emissive = isSelected ? '#ff6b00' : '#000000';
const emissiveIntensity = isSelected ? 0.3 : 0;
```

- Выделенный объект светится оранжевым (`emissive`)
- Intencity 0.3 делает подсветку заметной, но не агрессивной
- Цвет подсветки хорошо виден на объектах любого цвета

**Общие свойства для всех мешей:**

- `castShadow` — объект отбрасывает тени
- `receiveShadow` — объект принимает тени
- `onClick` — raycasting-обработчик клика (встроенный в R3F)

### 5. Обновленный SceneView.tsx

#### SceneView.tsx

Главный компонент Canvas с интеграцией Zustand.

**Изменения:**

1. **Подключение к store:**

   ```typescript
   const objects = useSceneStore((state) => state.objects);
   const selectedId = useSceneStore((state) => state.selectedId);
   const selectObject = useSceneStore((state) => state.selectObject);
   const showGrid = useEditorStore((state) => state.showGrid);
   ```

2. **Рендер объектов из store:**

   ```typescript
   {objects.map((obj) => (
     <SceneObject
       key={obj.id}
       data={obj}
       isSelected={obj.id === selectedId}
       onClick={(e) => {
         e.stopPropagation();  // Предотвращаем всплытие к Canvas
         selectObject(obj.id);
       }}
     />
   ))}
   ```

3. **Условное отображение сетки:**

   ```typescript
   {showGrid && <Grid />}
   ```

4. **Удален тестовый куб** — теперь объекты добавляются динамически через UI

### 6. Обновленный App.tsx

#### App.tsx

Добавлен функциональный UI для работы с объектами.

**Левый сайдбар — Добавление объектов:**

```typescript
const objectTypes: { type: ObjectType; label: string }[] = [
  { type: 'box', label: 'Куб' },
  { type: 'sphere', label: 'Сфера' },
  { type: 'cylinder', label: 'Цилиндр' },
  { type: 'cone', label: 'Конус' },
  { type: 'plane', label: 'Плоскость' },
  { type: 'torus', label: 'Тор' },
];

{objectTypes.map(({ type, label }) => (
  <button onClick={() => addObject(type)}>
    + {label}
  </button>
))}
```

**Список объектов сцены:**

- Отображение всех объектов с именами
- Подсветка выбранного объекта (синий фон)
- Кнопка удаления (✕) для каждого объекта
- Счетчик объектов: "Объекты сцены (N)"
- Сообщение "Сцена пуста" если объектов нет

**Переключатель сетки:**

- Кнопка "Показать сетку" с галочкой при включении
- Вызывает `toggleGrid()` из useEditorStore

**Правая панель — Свойства:**

- Показывает имя выбранного объекта
- Кнопка "Снять выделение"
- Placeholder для будущей панели свойств (Этап 5)

### 7. Структура файлов

```
client/src/
├── store/
│   ├── useSceneStore.ts     [НОВЫЙ] — управление объектами сцены
│   └── useEditorStore.ts    [НОВЫЙ] — UI-состояние редактора
├── components/
│   └── canvas/
│       ├── SceneObject.tsx  [НОВЫЙ] — рендер объектов по типу
│       └── SceneView.tsx    [ОБНОВЛЁН] — интеграция с Zustand
└── App.tsx                  [ОБНОВЛЁН] — UI для добавления объектов
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
# Открыть http://localhost:3001
```

## Функциональность

### Добавление объектов

1. В левом сайдбаре нажать кнопку "+ Куб" (или любой другой тип)
2. Объект появляется в центре сцены (position: [0, 0.5, 0])
3. Объект добавляется в список "Объекты сцены"

### Выделение объектов

**Клик по объекту:**

- Объект подсвечивается оранжевым (emissive glow)
- В списке объектов подсвечивается синим
- В правой панели отображается имя объекта

**Снятие выделения:**

- Кнопка "Снять выделение" в правой панели
- Подсветка исчезает

### Удаление объектов

- Кнопка "✕" в списке объектов
- Объект исчезает из сцены и из списка
- Если объект был выбран, выделение автоматически снимается

### Управление сеткой

- Кнопка "Показать сетку" в левом сайдбаре
- Переключает видимость gridHelper на сцене

## Технические детали

### Zustand selector pattern

Используется селекторный подход для оптимизации:

```typescript
// ✅ Компонент перерендерится только при изменении objects
const objects = useSceneStore((state) => state.objects);

// ❌ Плохо: перерендер при любом изменении store
const store = useSceneStore();
```

### React Three Fiber event handling

R3F предоставляет встроенный raycasting:

```typescript
<mesh onClick={(e) => {
  e.stopPropagation();  // Важно для вложенных объектов
  selectObject(obj.id);
}}>
```

- `ThreeEvent` — тип события от R3F
- Автоматический raycasting против mesh geometry
- `stopPropagation()` предотвращает всплытие события

### Emissive material для подсветки

Вместо outline или wireframe используется emissive:

**Преимущества:**

- Работает на всех типах геометрии
- Не требует дополнительных проходов рендеринга
- Визуально приятный эффект "свечения"
- Совместимо с PBR-материалами

```typescript
<meshStandardMaterial
  color={material.color}
  metalness={material.metalness}
  roughness={material.roughness}
  emissive={isSelected ? '#ff6b00' : '#000000'}
  emissiveIntensity={isSelected ? 0.3 : 0}
/>
```

### TypeScript типы из shared/

Все типы импортируются из `@shared/types/scene`:

```typescript
import type { SceneObjectData, ObjectType } from '@shared/types/scene';
```

Это обеспечивает единую систему типов для frontend и backend.

## Результат

✅ Полностью функциональная система управления объектами:

- Добавление объектов 6 типов (box, sphere, cylinder, cone, plane, torus)
- Удаление объектов из UI и сцены
- Выделение объектов кликом с визуальной подсветкой
- Синхронизация UI и 3D-сцены через Zustand
- Список объектов в сайдбаре с возможностью удаления
- Переключение видимости сетки
- TypeScript типизация без ошибок
- Готовая архитектура для дальнейшего расширения

## Следующий этап

**Этап 3: Каталог объектов + Drag & Drop**

Задачи:

- Красивый каталог с превью объектов
- Drag & Drop из каталога на canvas
- Raycasting на плоскость пола для определения 3D-координат drop
- Альтернативный способ добавления (кнопка "Add") для мобильных
- Удаление объекта по клавише Delete

## Заметки

- nanoid генерирует короткие уникальные ID (21 символ)
- Zustand не требует Provider — можно использовать хуки напрямую
- R3F автоматически конвертирует kebab-case props в camelCase для Three.js
- Emissive свечение видно даже в темных областях (не зависит от освещения)
- Store разделены по ответственности: scene data vs UI state

## Затраченное время

Этап 2: ~45 минут (установка Zustand + создание stores + компоненты + UI)

## Автор

Claude Code (Sonnet 4.5)
