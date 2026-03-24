# Этап 3: Drag & Drop + Каталог объектов (2026-03-24)

## Статус: ✅ ЗАВЕРШЕНО

## Описание

Реализован визуальный каталог объектов с drag & drop функциональностью. Пользователи могут перетаскивать примитивы из каталога на 3D-сцену. Добавлена поддержка горячих клавиш (Delete для удаления, Escape для снятия выделения).

## Цель этапа

Создать интуитивный способ добавления объектов на сцену через drag & drop. Улучшить UX за счет визуального каталога с иконками и поддержки клавиатуры.

## Выполненные задачи

### 1. Установка зависимостей

```bash
npm install react-dnd react-dnd-html5-backend --workspace=client
```

**Установленные пакеты:**

- `react-dnd` — библиотека drag & drop для React
- `react-dnd-html5-backend` — HTML5 backend для react-dnd

### 2. Каталог объектов (ObjectCatalog.tsx)

#### components/ui/ObjectCatalog.tsx

Визуальный каталог с draggable элементами.

**Структура данных каталога:**

```typescript
interface CatalogItem {
  type: ObjectType;
  label: string;
  icon: string; // Unicode символ для визуального представления
}

const catalogItems: CatalogItem[] = [
  { type: 'box', label: 'Куб', icon: '◻' },
  { type: 'sphere', label: 'Сфера', icon: '○' },
  { type: 'cylinder', label: 'Цилиндр', icon: '▭' },
  { type: 'cone', label: 'Конус', icon: '△' },
  { type: 'plane', label: 'Плоскость', icon: '▬' },
  { type: 'torus', label: 'Тор', icon: '◯' },
];
```

**DraggableItem компонент:**

```typescript
function DraggableItem({ item }: DraggableItemProps) {
  const [{ isDragging }, drag] = useDrag({
    type: 'SCENE_OBJECT',
    item: { objectType: item.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-move ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      <div className="text-3xl mb-1">{item.icon}</div>
      <div className="text-xs text-gray-300">{item.label}</div>
    </div>
  );
}
```

**Особенности:**

- Unicode иконки для каждого типа объекта
- Grid layout (2 колонки)
- Визуальная обратная связь при drag (`opacity-50 scale-95`)
- Cursor указывает на возможность перетаскивания (`cursor-move`)
- Подсказка: "Перетащите объект на сцену"

### 3. Drop Target (CanvasDropTarget.tsx)

#### components/ui/CanvasDropTarget.tsx

DOM-обёртка для canvas, принимающая drop события.

**CanvasDropTarget компонент:**

```typescript
export function CanvasDropTarget({ children }: CanvasDropTargetProps) {
  const addObject = useSceneStore((state) => state.addObject);

  const [{ isOver }, drop] = useDrop({
    accept: 'SCENE_OBJECT',
    drop: (item: DropItem) => {
      // Добавляем объект с случайной позицией рядом с центром
      const randomX = (Math.random() - 0.5) * 6;
      const randomZ = (Math.random() - 0.5) * 6;
      const newId = addObject(item.objectType);

      // Обновляем позицию
      useSceneStore.getState().updateObject(newId, {
        position: [randomX, 0.5, randomZ],
      });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop}
      className={`flex-1 relative transition-colors ${
        isOver ? 'bg-blue-900/20' : ''
      }`}
    >
      {children}
    </div>
  );
}
```

**Визуальная обратная связь:**

- При наведении (hover): фон меняется на `bg-blue-900/20` (полупрозрачный синий)
- Плавный переход через `transition-colors`

**Логика добавления:**

1. При drop получаем тип объекта из `item.objectType`
2. Генерируем случайную позицию в диапазоне ±3 единицы от центра
3. Добавляем объект через `addObject()`
4. Обновляем позицию через `updateObject()`

**Примечание:** Полноценный raycasting для точного определения 3D-координат drop будет реализован на следующих этапах. Текущая реализация использует случайную позицию для простоты.

### 4. Горячие клавиши (useKeyboardShortcuts.ts)

#### hooks/useKeyboardShortcuts.ts

Хук для обработки клавиатурных сокращений.

**Реализованные клавиши:**

| Клавиша   | Действие        | Условие       |
| --------- | --------------- | ------------- |
| Delete    | Удалить объект  | Объект выбран |
| Backspace | Удалить объект  | Объект выбран |
| Escape    | Снять выделение | Объект выбран |

```typescript
export function useKeyboardShortcuts() {
  const selectedId = useSceneStore((state) => state.selectedId);
  const removeObject = useSceneStore((state) => state.removeObject);
  const deselectAll = useSceneStore((state) => state.deselectAll);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Delete / Backspace - удалить выбранный объект
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedId) {
        event.preventDefault();
        removeObject(selectedId);
      }

      // Escape - снять выделение
      if (event.key === 'Escape' && selectedId) {
        event.preventDefault();
        deselectAll();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, removeObject, deselectAll]);
}
```

**Особенности:**

- `event.preventDefault()` — предотвращает действия по умолчанию (навигацию назад для Backspace)
- Работает только когда объект выбран
- Автоматическая очистка event listener при размонтировании
- Зависимости в useEffect обновляются при изменении selectedId

### 5. Обновленный App.tsx

**Интеграция DndProvider:**

```typescript
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

function App() {
  useKeyboardShortcuts(); // Подключаем горячие клавиши

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Layout */}
    </DndProvider>
  );
}
```

**Изменения в layout:**

1. **Замена кнопок на ObjectCatalog:**
   - Удалены старые кнопки "+ Куб", "+ Сфера" и т.д.
   - Добавлен компонент `<ObjectCatalog />` с drag & drop

2. **Обёртка canvas:**

   ```typescript
   <CanvasDropTarget>
     <SceneView />
   </CanvasDropTarget>
   ```

3. **Обновлена версия этапа:**
   ```typescript
   <p className="text-xs text-gray-400 mt-1">Этап 3: Drag & Drop</p>
   ```

### 6. Обновление useSceneStore

**Изменение сигнатуры `addObject`:**

```typescript
// Было:
addObject: (type: ObjectType) => void;

// Стало:
addObject: (type: ObjectType) => string; // Возвращает ID объекта
```

**Реализация:**

```typescript
addObject: (type) => {
  const newObject = createDefaultObject(type);
  set((state) => ({
    objects: [...state.objects, newObject],
  }));
  return newObject.id; // Возвращаем ID для последующего update
},
```

**Зачем:** Чтобы в CanvasDropTarget можно было сразу обновить позицию созданного объекта.

### 7. Обновление SceneView.tsx

**Добавлен импорт:**

```typescript
import { CanvasDropZone } from '../ui/CanvasDropTarget';
```

**Добавлен компонент в Canvas:**

```typescript
{/* Drop zone для drag & drop */}
<CanvasDropZone />
```

**Примечание:** CanvasDropZone в текущей реализации возвращает `null`, так как логика drop обрабатывается на уровне DOM-обёртки. В будущих этапах здесь будет визуальный индикатор drop zone.

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
# Открыть http://localhost:3002
```

## Функциональность

### Drag & Drop объектов

**Шаги:**

1. Навести курсор на элемент каталога (Куб, Сфера, и т.д.)
2. Зажать ЛКМ и начать перетаскивание
3. Элемент станет полупрозрачным (`opacity-50`)
4. Перетащить курсор на область 3D canvas
5. Фон canvas станет синеватым (`bg-blue-900/20`)
6. Отпустить ЛКМ
7. Объект появится на сцене в случайной позиции рядом с центром

**Визуальная обратная связь:**

- При drag: элемент каталога становится полупрозрачным и уменьшается
- При hover над canvas: фон подсвечивается синим
- После drop: объект появляется на сцене, добавляется в список

### Горячие клавиши

**Delete / Backspace:**

1. Выбрать объект кликом
2. Нажать Delete или Backspace
3. Объект удаляется из сцены и списка

**Escape:**

1. Выбрать объект кликом
2. Нажать Escape
3. Выделение снимается (оранжевая подсветка исчезает)

### Список объектов

- Отображает все объекты сцены
- Подсвечивает выбранный объект синим
- Кнопка удаления (✕) для каждого объекта

## Технические детали

### React DnD Architecture

**Три ключевых понятия:**

1. **DragSource** (`useDrag`) — элементы каталога
2. **DropTarget** (`useDrop`) — canvas wrapper
3. **DragDropContext** (`DndProvider`) — обёртка для всего приложения

**Data Flow:**

```
Drag Start → Item { objectType: 'box' }
     ↓
Drag Over Canvas → isOver: true
     ↓
Drop → addObject('box') → updateObject(id, position)
     ↓
Render → SceneObject появляется на сцене
```

### HTML5 Backend

Используется HTML5 Drag & Drop API:

**Преимущества:**

- Нативная поддержка браузерами
- Touch-поддержка (на мобильных может потребоваться touch backend)
- Визуальная обратная связь из коробки

**Ограничения:**

- Требует DOM-элементов (нельзя использовать внутри `<Canvas>`)
- На мобильных может работать нестабильно (решается через TouchBackend)

### Разделение Drop логики

**DOM Layer (CanvasDropTarget):**

- Обрабатывает drop события
- Создаёт объект в store
- Обновляет позицию

**Canvas Layer (CanvasDropZone):**

- В будущем: визуальный индикатор drop zone
- В будущем: raycasting для точного определения позиции

### Keyboard Event Handling

**Global vs Local:**

```typescript
window.addEventListener('keydown', handleKeyDown);
```

- Слушаем события на `window`, а не на конкретном элементе
- Работает вне зависимости от фокуса
- Важно: `event.preventDefault()` предотвращает конфликты с браузером

### Random Position Algorithm

```typescript
const randomX = (Math.random() - 0.5) * 6; // Диапазон: -3 до +3
const randomZ = (Math.random() - 0.5) * 6;
position: [randomX, 0.5, randomZ]; // Y фиксированный (0.5)
```

**Почему случайная позиция:**

- Полноценный raycasting требует доступа к камере и canvas
- В DOM layer нет прямого доступа к Three.js
- Упрощение для текущего этапа

**План улучшения (следующие этапы):**

- Raycasting на плоскость пола через координаты мыши
- Конвертация screen space → world space
- Точное позиционирование в место drop

## Структура файлов

```
client/src/
├── hooks/
│   └── useKeyboardShortcuts.ts  [НОВЫЙ] — горячие клавиши
├── components/
│   ├── ui/
│   │   ├── ObjectCatalog.tsx        [НОВЫЙ] — каталог с drag
│   │   └── CanvasDropTarget.tsx     [НОВЫЙ] — drop target + wrapper
│   └── canvas/
│       └── SceneView.tsx            [ОБНОВЛЁН] — добавлен CanvasDropZone
├── store/
│   └── useSceneStore.ts             [ОБНОВЛЁН] — addObject возвращает ID
└── App.tsx                          [ОБНОВЛЁН] — DndProvider + новый layout
```

## Результат

✅ Полностью функциональный drag & drop:

- Визуальный каталог с 6 типами примитивов (box, sphere, cylinder, cone, plane, torus)
- Перетаскивание объектов из каталога на сцену
- Визуальная обратная связь при drag (прозрачность, подсветка)
- Случайная позиция объектов при drop (временное решение)
- Горячие клавиши: Delete/Backspace (удалить), Escape (снять выделение)
- Удобный UX с поддержкой клавиатуры
- TypeScript типизация без ошибок

## Следующий этап

**Этап 4: Transform Gizmo**

Задачи:

- Создать TransformGizmo компонент (обёртка над `<TransformControls>` из drei)
- Привязать gizmo к выделенному объекту
- Переключение режимов: translate / rotate / scale
- Горячие клавиши: W (translate), E (rotate), R (scale)
- Синхронизация: gizmo → store → UI панель
- Отключение OrbitControls во время работы с gizmo
- Snap to grid (опциональный режим)

## Заметки

- react-dnd v16+ требует функциональные компоненты (хуки)
- HTML5Backend не работает на старых мобильных браузерах (нужен TouchBackend)
- `cursor-move` применяется через Tailwind класс
- Unicode иконки (◻ ○ ▭ △) поддерживаются всеми современными браузерами
- Backspace на Windows/Linux, Delete на macOS — обе клавиши обрабатываются
- `event.preventDefault()` критически важен для Backspace (иначе навигация назад)

## Затраченное время

Этап 3: ~40 минут (установка react-dnd + каталог + drop target + горячие клавиши)

## Автор

Claude Code (Sonnet 4.5)
