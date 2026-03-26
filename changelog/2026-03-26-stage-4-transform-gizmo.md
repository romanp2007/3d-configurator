# Stage 4: Transform Gizmo — 2026-03-26

## Цель этапа

Реализация интерактивного гизмо для манипуляции объектами в 3D-пространстве с поддержкой трёх режимов трансформации (перемещение, вращение, масштабирование).

## Реализованная функциональность

### 1. Transform Gizmo (`TransformGizmo.tsx`)

Компонент-обёртка над `TransformControls` из `@react-three/drei`:

- **Интеграция с Zustand store**: синхронизация позиции/вращения/масштаба с `useSceneStore`
- **Три режима трансформации**: translate, rotate, scale (управляются через `useEditorStore`)
- **События перетаскивания**: `mouseDown` и `mouseUp` для управления состоянием `OrbitControls`
- **Финальная синхронизация**: обновление store происходит только при `mouseUp`, предотвращая бесконечные циклы

**Ключевое решение проблемы двойной трансформации:**

- `TransformControls` получает начальные координаты из `selectedObject` (position, rotation, scale)
- `SceneObject` внутри рендерится с нулевыми трансформациями `[0,0,0]` для position/rotation, `[1,1,1]` для scale
- Объект находится в локальной системе координат `TransformControls`, избегая Mat_obj = Mat_initial × Mat_gizmo

```typescript
<TransformControls
  ref={controlsRef}
  mode={transformMode}
  position={selectedObject.position}
  rotation={selectedObject.rotation}
  scale={selectedObject.scale}
>
  <SceneObject
    data={{
      ...selectedObject,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    }}
    isSelected={true}
    onClick={() => {}}
  />
</TransformControls>
```

### 2. Toolbar (`Toolbar.tsx`)

UI-панель для переключения режимов трансформации:

- **Визуальная индикация**: активный режим подсвечивается синим цветом
- **Keyboard hints**: отображение горячих клавиш (W/E/R) рядом с названием режима
- **Стилизация**: полупрозрачный фон с backdrop-blur, центрированное позиционирование сверху канваса

### 3. Keyboard Shortcuts (расширение `useKeyboardShortcuts.ts`)

Добавлены горячие клавиши для переключения режимов:

- **W** — режим перемещения (translate)
- **E** — режим вращения (rotate)
- **R** — режим масштабирования (scale)

Интеграция с существующими шорткатами (Delete/Backspace, Escape).

### 4. Camera Controls Integration (`CameraControls.tsx`)

Добавлен проп `enabled`:

```typescript
interface CameraControlsProps {
  enabled?: boolean;
}

export function CameraControls({ enabled = true }: CameraControlsProps) {
  return <OrbitControls makeDefault enabled={enabled} /* ... */ />;
}
```

Позволяет отключать `OrbitControls` во время взаимодействия с гизмо, предотвращая конфликт управления.

### 5. Scene View Integration (`SceneView.tsx`)

Интеграция `TransformGizmo` в сцену:

- **State управления**: `isDraggingGizmo` для контроля состояния `OrbitControls`
- **Условный рендеринг**: выбранный объект не рендерится в основном списке (только внутри `TransformGizmo`)

```typescript
<CameraControls enabled={!isDraggingGizmo} />

<TransformGizmo
  onDragStart={() => setIsDraggingGizmo(true)}
  onDragEnd={() => setIsDraggingGizmo(false)}
/>

{objects.map((obj) => {
  // Не рендерим выбранный объект - он в TransformGizmo
  if (obj.id === selectedId) return null;
  return <SceneObject key={obj.id} data={obj} isSelected={false} onClick={...} />;
})}
```

## Технические детали

### Архитектура синхронизации

1. **Пользователь перетаскивает гизмо** → Three.js обновляет position/rotation/scale объекта в реальном времени
2. **Событие `mouseUp`** → синхронизация финальных координат с Zustand store
3. **Store обновлён** → React re-render (но объект уже на нужной позиции, видимых скачков нет)

### Проблемы и решения

#### Проблема 1: Бесконечный цикл обновлений

**Симптом:** `Maximum update depth exceeded` при наведении/клике на гизмо

**Причина:** Событие `onChange` (или `change`) срабатывает постоянно, создавая цикл:

```
onChange → updateStore → re-render → onChange → updateStore → ...
```

**Решение:** Использовать события `mouseDown` и `mouseUp` вместо `onChange`. Обновление store происходит **только один раз** при отпускании мыши.

#### Проблема 2: Двойная трансформация (Mat_obj = Mat_global × Mat_global)

**Симптом:** Объект визуально смещается при выборе, "улетает" в неправильную позицию

**Причина:** `SceneObject` имеет свои координаты (например, `[5, 0, 3]`), а `TransformControls` применяет дополнительную трансформацию → Mat_obj = Mat_initial × Mat_gizmo

**Решение:**

- Передать начальные координаты в `TransformControls` как props (`position`, `rotation`, `scale`)
- Рендерить `SceneObject` внутри с нулевыми трансформациями (локальная система координат)

### События TransformControls (drei)

Используемые события через `addEventListener`:

- `mouseDown` — начало взаимодействия с гизмо
- `mouseUp` — конец взаимодействия, момент синхронизации с store

## Обновлённые файлы

### Созданные файлы:

- `client/src/components/canvas/TransformGizmo.tsx` — компонент гизмо
- `client/src/components/ui/Toolbar.tsx` — панель переключения режимов

### Изменённые файлы:

- `client/src/hooks/useKeyboardShortcuts.ts` — добавлены W/E/R для режимов трансформации
- `client/src/components/canvas/CameraControls.tsx` — добавлен проп `enabled`
- `client/src/components/canvas/SceneView.tsx` — интеграция `TransformGizmo`, управление `isDraggingGizmo`
- `client/src/App.tsx` — добавлен `<Toolbar />` над канвасом

## Результат

✅ Гизмо появляется на выбранном объекте
✅ Три режима трансформации (translate/rotate/scale)
✅ Переключение через Toolbar или клавиши W/E/R
✅ OrbitControls автоматически отключается во время перетаскивания
✅ Финальная позиция синхронизируется с Zustand store
✅ Нет визуальных артефактов и бесконечных циклов

## Следующий этап

**Stage 5: Properties Panel** — реализация боковой панели с инпутами для ручного редактирования position, rotation, scale, material properties выбранного объекта.
