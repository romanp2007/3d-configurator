# Этап 11: Загрузка ассетов (текстуры, модели)

**Дата:** 2026-04-07
**Статус:** ✅ ЗАВЕРШЕНО

## Что реализовано

### Backend

**server/src/routes/assets.ts**
- `POST /api/assets/upload` — загрузка файла через Multer
  - Разрешённые форматы: PNG, JPG (текстуры), GLB, GLTF (модели)
  - Лимит: 50 MB
  - Имя файла: `originalname-timestamp.ext` (спецсимволы заменяются на `_`)
  - Защита от path traversal в GET-роуте
  - Возвращает `{ url, filename, originalName, size, type }`
- `GET /api/assets/files/:filename` — отдача загруженного файла (`sendFile`)
- `GET /api/assets` — список всех загруженных файлов с типом

Папка `server/uploads/` создаётся автоматически при запуске если отсутствует.

**server/src/index.ts** — подключён `assetsRouter` на `/api/assets`.

### Frontend

**client/src/api/assetsApi.ts**
- `uploadAsset(file)` — POST multipart/form-data, возвращает `AssetInfo`
- `listAssets()` — GET список файлов

**client/src/components/ui/properties/MaterialSection.tsx**
- Кнопка «+ Загрузить текстуру (PNG, JPG)» — открывает file input
- После загрузки: превью текстуры + кнопка «Удалить текстуру»
- Состояния: uploading / uploadError

**client/src/components/canvas/SceneObject.tsx**
- `ObjectMaterial` — компонент материала с опциональной текстурой
  - Если `textureUrl` есть — рендерит `TexturedMaterial` через `useTexture` (drei) внутри `<Suspense>`
  - Fallback — материал без текстуры
  - `texture.wrapS = texture.wrapT = RepeatWrapping`
- `GltfModel` — загрузка GLB через `useGLTF`, клонирование сцены, применение emissive на все меши
- `type === 'model'` без `modelUrl` — wireframe-заглушка

**client/src/components/ui/ObjectCatalog.tsx**
- Секция «3D Модели»: кнопка «+ GLB» → загружает файл → обновляет список с сервера
- Каждая модель — кнопка `ModelItem`: клик добавляет `type: 'model'` в store с `modelUrl`
- При старте компонента — `useEffect` загружает список моделей с сервера (graceful fail если сервер недоступен)

## Файлы

**Backend:**
- [assets.ts](../server/src/routes/assets.ts)
- [index.ts](../server/src/index.ts)

**Frontend:**
- [assetsApi.ts](../client/src/api/assetsApi.ts)
- [MaterialSection.tsx](../client/src/components/ui/properties/MaterialSection.tsx)
- [SceneObject.tsx](../client/src/components/canvas/SceneObject.tsx)
- [ObjectCatalog.tsx](../client/src/components/ui/ObjectCatalog.tsx)

## Технологии

Multer (diskStorage), @react-three/drei useTexture + useGLTF, THREE.RepeatWrapping, React Suspense, FormData, FileReader
