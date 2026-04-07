# Этап 5: Панель свойств (Properties Panel)

**Дата:** 2026-04-07
**Статус:** ✅ ЗАВЕРШЕНО

## Что реализовано

### PropertiesPanel.tsx
Основной контейнер панели свойств. Отображается в правом сайдбаре при выделении объекта. При отсутствии выделения показывает заглушку «Выберите объект».

### TransformSection.tsx
Секция трансформаций с числовыми полями:
- Position X/Y/Z — шаг 0.1
- Rotation X/Y/Z — шаг 0.01 (радианы)
- Scale X/Y/Z — шаг 0.1

Изменение любого поля → `updateObject()` в useSceneStore → Three.js объект обновляется мгновенно. Двусторонняя синхронизация: гизмо → store → поля панели.

### MaterialSection.tsx
Секция материала объекта:
- Поле ввода hex-цвета + нативный color picker (`<input type="color">`)
- Слайдер metalness (0–1, шаг 0.01)
- Слайдер roughness (0–1, шаг 0.01)

### Дополнительные поля
- Имя объекта (редактируемый `<input>`)
- Чекбокс «Видимый» — управляет `visible` флагом в store

## Файлы

- [PropertiesPanel.tsx](../client/src/components/ui/PropertiesPanel.tsx)
- [TransformSection.tsx](../client/src/components/ui/properties/TransformSection.tsx)
- [MaterialSection.tsx](../client/src/components/ui/properties/MaterialSection.tsx)

## Технологии

React controlled inputs, Zustand `updateObject`, двусторонняя синхронизация store ↔ Three.js
