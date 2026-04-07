/**
 * HTTP-клиент для работы с API ассетов (текстуры, 3D-модели)
 */

export interface AssetInfo {
  url: string;
  filename: string;
  originalName: string;
  size: number;
  type: 'texture' | 'model';
}

export interface AssetListItem {
  filename: string;
  url: string;
  type: 'texture' | 'model';
}

/**
 * Загрузить файл на сервер (текстура PNG/JPG или модель GLB/GLTF)
 */
export async function uploadAsset(file: File): Promise<AssetInfo> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/assets/upload', {
    method: 'POST',
    body: formData,
    // Content-Type не задаём — браузер сам выставит multipart/form-data с boundary
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<AssetInfo>;
}

/**
 * Список всех загруженных файлов
 */
export async function listAssets(): Promise<AssetListItem[]> {
  const res = await fetch('/api/assets');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<AssetListItem[]>;
}
