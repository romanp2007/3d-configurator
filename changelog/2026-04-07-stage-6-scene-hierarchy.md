# Этап 6: Scene Hierarchy (дерево объектов)

**Дата:** 2026-04-07
**Статус:** ✅ ЗАВЕРШЕНО

## Что реализовано

### SceneHierarchy.tsx
Список всех объектов сцены в левом сайдбаре (под ObjectCatalog).

**Функциональность:**
- Клик по элементу → `selectObject(id)` → подсветка в сцене
- Двойной клик → инлайн-редактирование имени (input, Enter/Escape)
- Иконки типов: ◻ box, ○ sphere, ▭ cylinder, △ cone, ▬ plane, ◯ torus
- Кнопка «глаз» — toggle `visible` (hover-visible)
- Кнопка «дублировать» (📋) — `duplicateObject(id)` (hover-visible)
- Кнопка «удалить» (✕) — `removeObject(id)` (hover-visible)
- Счётчик объектов в заголовке
- Пустое состояние: «Сцена пуста. Перетащите объект из каталога.»
- Выделенный элемент подсвечен синим фоном

## Файлы

- [SceneHierarchy.tsx](../client/src/components/ui/SceneHierarchy.tsx)

## Технологии

Zustand useSceneStore (objects, selectedId, selectObject, removeObject, duplicateObject, updateObject), controlled input для rename, conditional rendering hover-действий
