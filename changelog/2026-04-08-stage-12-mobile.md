# Этап 12: Мобильная адаптация

**Дата:** 2026-04-08
**Статус:** ✅ ЗАВЕРШЕНО

## Что реализовано

### client/src/hooks/useBreakpoint.ts
Хук `useBreakpoint()` — слушает `resize`, возвращает `'mobile' | 'tablet' | 'desktop'`:
- mobile: < 768px
- tablet: 768–1199px
- desktop: ≥ 1200px

### client/src/components/ui/MobileToolbar.tsx
Фиксированная нижняя панель для мобильных. Две строки:
- **Верхняя** (только при выделенном объекте): переключатели режима гизмо translate/rotate/scale
- **Нижняя**: Объекты (toggle каталога), Undo, Redo, Скриншот, Сохранить, Открыть, Свойства

Disabled-состояния: Undo/Redo когда история пуста, Свойства когда ничего не выделено.

### client/src/components/ui/PropertiesPanel.tsx (рефактор)
Логика вынесена в `PanelContent`. Пропсы:
- `bare=false` (default) — рендер внутри `<aside>` (Desktop)
- `bare=true` — только содержимое без обёртки (для bottom sheet и tablet-слайдера)

### client/src/App.tsx — три layout-режима

**Mobile (<768px):**
- `<SceneView>` занимает весь экран (`flex-1`)
- Bottom sheets: абсолютно позиционированные панели снизу (`bottom-24`, `max-h-[55vh]`), открываются кнопками в MobileToolbar
- Drag & drop отключён визуально (нет drag из каталога), модели добавляются кнопкой в каталоге
- `<MobileToolbar>` зафиксирован снизу

**Tablet (768–1199px):**
- Сайдбар: сворачивается/раскрывается (`w-64`/`w-0`), кнопка «☰» слева
- Панель свойств: аналогично (`w-80`/`w-0`), кнопка «⚙» появляется при выделении объекта
- Desktop `<Toolbar>` сохраняется
- Плавная анимация `transition-all duration-200`

**Desktop (≥1200px):**
- Прежний трёхколоночный layout без изменений

### client/index.html
Добавлен `maximum-scale=1.0, user-scalable=no` — отключает браузерный двойной-тап-зум, т.к. pinch-to-zoom обрабатывается OrbitControls.

## Touch-управление

OrbitControls из drei поддерживает из коробки:
- Одним пальцем — вращение камеры
- Двумя пальцами (pinch) — zoom
- Двумя пальцами (pan) — панорама
- Tap — выделение объекта (через R3F onClick)

## Файлы

- [useBreakpoint.ts](../client/src/hooks/useBreakpoint.ts)
- [MobileToolbar.tsx](../client/src/components/ui/MobileToolbar.tsx)
- [PropertiesPanel.tsx](../client/src/components/ui/PropertiesPanel.tsx)
- [App.tsx](../client/src/App.tsx)
- [index.html](../client/index.html)

## Технологии

window.innerWidth + resize listener, CSS transitions, абсолютное позиционирование, OrbitControls touch events
