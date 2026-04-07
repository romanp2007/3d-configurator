# Этап 10: Скриншот и экспорт

**Дата:** 2026-04-07
**Статус:** ✅ ЗАВЕРШЕНО

## Что реализовано

### client/src/hooks/useScreenshot.ts
Хук `useScreenshot()` возвращает:
- `screenshotRef` — ref, передаётся в `<SceneView>`
- `takeScreenshot()` — делает снимок и скачивает PNG с именем `scene-YYYY-MM-DDTHH-MM-SS.png`
- `getThumbnail()` — возвращает dataURL для сохранения как thumbnail

### client/src/components/canvas/SceneView.tsx (дополнение)
- `Canvas` получил `preserveDrawingBuffer: true` — без этого `toDataURL()` возвращает пустой холст
- Внутренний компонент `ScreenshotCapture` использует `useThree()` для доступа к `gl.domElement` и экспонирует `getDataUrl()` через `useImperativeHandle`
- `SceneView` стал `forwardRef`-компонентом, принимает `screenshotRef`

### client/src/utils/sceneSerializer.ts (дополнение)
- `exportSceneToJson(objects, filename?)` — создаёт Blob с JSON, скачивает файл
- `importSceneFromJson(file)` — читает File через FileReader, парсит JSON, возвращает `SceneObjectData[]` или `null` при ошибке

### client/src/components/ui/Toolbar.tsx (дополнение)
Добавлены кнопки:
- 📷 — скриншот (`onScreenshot`)
- ⬇ JSON — экспорт (`onExportJson`)
- ⬆ JSON — импорт (`onImportJson`), открывает скрытый `<input type="file" accept=".json">`

### client/src/components/ui/SaveLoadDialog.tsx (дополнение)
- Принимает `getThumbnail?: () => string | null`
- При сохранении передаёт thumbnail в `saveScene(name, thumbnail)`
- В списке сцен отображает превью `<img>` если `scene.thumbnail` есть, иначе заглушку «3D»

### client/src/hooks/useSceneApi.ts (дополнение)
`saveScene(name, thumbnail?)` — принимает опциональный thumbnail и передаёт в API.

## Файлы

- [useScreenshot.ts](../client/src/hooks/useScreenshot.ts)
- [SceneView.tsx](../client/src/components/canvas/SceneView.tsx)
- [sceneSerializer.ts](../client/src/utils/sceneSerializer.ts)
- [Toolbar.tsx](../client/src/components/ui/Toolbar.tsx)
- [SaveLoadDialog.tsx](../client/src/components/ui/SaveLoadDialog.tsx)
- [useSceneApi.ts](../client/src/hooks/useSceneApi.ts)
- [App.tsx](../client/src/App.tsx)

## Технологии

WebGL `preserveDrawingBuffer`, `canvas.toDataURL()`, `useThree` + `useImperativeHandle`, `FileReader`, `Blob` + `URL.createObjectURL`
