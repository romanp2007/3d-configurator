# Этап 9: Интеграция Frontend ↔ Backend

**Дата:** 2026-04-07
**Статус:** ✅ ЗАВЕРШЕНО

## Что реализовано

### client/src/api/scenesApi.ts
HTTP-клиент на основе `fetch`. Функции: `listScenes`, `getScene`, `createScene`, `updateScene`, `deleteScene`. Централизованная обработка ошибок: если `res.ok === false` — бросает `Error` с текстом из тела ответа. DELETE 204 возвращает `undefined`.

### client/src/utils/sceneSerializer.ts
Конвертация между store и API:
- `serializeScene(objects)` → `SceneData` с дефолтными camera/environment
- `deserializeScene(data)` → `SceneObjectData[]` для загрузки в store

### client/src/store/useSceneStore.ts (дополнение)
Добавлен метод `loadObjects(objects)` — заменяет все объекты в store и сбрасывает выделение. Нужен для загрузки сцены из API.

### client/src/hooks/useSceneApi.ts
React-хук с состояниями `loading` / `error`. Методы:
- `listScenes()` — список метаданных
- `saveScene(name)` — создать новую сцену из текущего store
- `updateScene(id)` — перезаписать существующую
- `loadScene(id)` — загрузить в store
- `deleteScene(id)` — удалить

### client/src/components/ui/SaveLoadDialog.tsx
Модальный диалог в двух режимах:

**Save:** поле ввода имени + кнопка «Сохранить» (Enter тоже работает). После сохранения показывает успех и обновляет список.

**Load:** список сохранённых сцен с датой. Клик выделяет, кнопка «Загрузить» закрывает диалог. Удаление с подтверждением (Да/Нет inline).

Закрытие: кнопка ✕, Escape, клик по оверлею.

### client/src/components/ui/Toolbar.tsx (дополнение)
Добавлены кнопки «💾 Сохранить» и «📂 Загрузить» через пропсы `onSave`/`onLoad`.

### client/src/hooks/useKeyboardShortcuts.ts (дополнение)
- `Ctrl+S` → `onSave()`
- `Ctrl+O` → `onLoad()`

### client/src/App.tsx (дополнение)
Управляет состоянием `dialogMode: 'save' | 'load' | null`. Передаёт коллбэки в Toolbar и useKeyboardShortcuts. Рендерит `<SaveLoadDialog>` условно.

## Файлы

- [scenesApi.ts](../client/src/api/scenesApi.ts)
- [sceneSerializer.ts](../client/src/utils/sceneSerializer.ts)
- [useSceneApi.ts](../client/src/hooks/useSceneApi.ts)
- [SaveLoadDialog.tsx](../client/src/components/ui/SaveLoadDialog.tsx)
- [Toolbar.tsx](../client/src/components/ui/Toolbar.tsx)
- [useKeyboardShortcuts.ts](../client/src/hooks/useKeyboardShortcuts.ts)
- [App.tsx](../client/src/App.tsx)
- [useSceneStore.ts](../client/src/store/useSceneStore.ts)

## Технологии

fetch API, React useState/useCallback/useEffect, Zustand loadObjects, Vite proxy /api
