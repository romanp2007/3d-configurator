# Этап 7: Undo / Redo

**Дата:** 2026-04-07
**Статус:** ✅ ЗАВЕРШЕНО

## Что реализовано

### zundo temporal middleware
`useSceneStore` обёрнут в `temporal()` из zundo v2.3.0. Все мутации store (addObject, removeObject, updateObject, duplicateObject, selectObject) автоматически пишут в историю. Лимит: 50 состояний.

### useHistoryStore.ts
Вспомогательный хук, инкапсулирующий доступ к `useSceneStore.temporal`:
- `undo()` — откатить одно действие
- `redo()` — повторить одно действие
- `canUndo` — `boolean`, прошлых состояний > 0
- `canRedo` — `boolean`, будущих состояний > 0

### Toolbar.tsx
Кнопки ↶ (Undo) и ↷ (Redo) с disabled-состоянием при отсутствии истории/будущего.

### useKeyboardShortcuts.ts
- `Ctrl+Z` → `undo()`
- `Ctrl+Shift+Z` → `redo()`

## Проверенный сценарий
Добавить объект → переместить → Ctrl+Z (объект на старом месте) → Ctrl+Z (объект удалён) → Ctrl+Shift+Z (объект снова добавлен).

## Файлы

- [useSceneStore.ts](../client/src/store/useSceneStore.ts) — temporal middleware
- [useHistoryStore.ts](../client/src/store/useHistoryStore.ts)
- [Toolbar.tsx](../client/src/components/ui/Toolbar.tsx)
- [useKeyboardShortcuts.ts](../client/src/hooks/useKeyboardShortcuts.ts)

## Технологии

zundo 2.3.0, Zustand temporal middleware, keyboard event listener
