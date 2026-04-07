/**
 * Каталог объектов с drag & drop
 * Отображает примитивы и пользовательские 3D-модели
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { useDrag } from 'react-dnd';
import type { ObjectType } from '@shared/types/scene';
import { uploadAsset, listAssets, type AssetListItem } from '@/api/assetsApi';
import { useSceneStore } from '@/store/useSceneStore';
import { toast } from '@/store/useToastStore';

interface CatalogItem {
  type: ObjectType;
  label: string;
  icon: string;
}

const catalogItems: CatalogItem[] = [
  { type: 'box', label: 'Куб', icon: '◻' },
  { type: 'sphere', label: 'Сфера', icon: '○' },
  { type: 'cylinder', label: 'Цилиндр', icon: '▭' },
  { type: 'cone', label: 'Конус', icon: '△' },
  { type: 'plane', label: 'Плоскость', icon: '▬' },
  { type: 'torus', label: 'Тор', icon: '◯' },
];

// --- Draggable примитив ---

function DraggableItem({ item }: { item: CatalogItem }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'SCENE_OBJECT',
    item: { objectType: item.type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <div
      ref={drag}
      className={`p-3 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-move text-center transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100'
      }`}
    >
      <div className="text-3xl mb-1">{item.icon}</div>
      <div className="text-xs text-gray-300">{item.label}</div>
    </div>
  );
}

// --- Кнопка модели из сервера ---

function ModelItem({ asset }: { asset: AssetListItem }) {
  const addObject = useSceneStore((state) => state.addObject);
  const updateObject = useSceneStore((state) => state.updateObject);

  const handleAdd = () => {
    const id = addObject('model');
    updateObject(id, { modelUrl: asset.url, name: asset.filename.replace(/-\d+(\.\w+)$/, '$1') });
  };

  const shortName = asset.filename.replace(/-\d+/, '').slice(0, 18);

  return (
    <button
      onClick={handleAdd}
      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
      title={`Добавить ${asset.filename}`}
    >
      <span className="text-lg flex-shrink-0">🧊</span>
      <span className="text-xs text-gray-300 truncate">{shortName}</span>
    </button>
  );
}

// --- Основной компонент ---

export function ObjectCatalog() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [models, setModels] = useState<AssetListItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const refreshModels = useCallback(async () => {
    try {
      const assets = await listAssets();
      setModels(assets.filter((a) => a.type === 'model'));
    } catch {
      // Сервер недоступен — просто пустой список
    }
  }, []);

  useEffect(() => {
    refreshModels();
  }, [refreshModels]);

  const handleModelUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      await uploadAsset(file);
      await refreshModels();
      toast.success(`Модель «${file.name}» загружена`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка загрузки';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-4">
      {/* Примитивы */}
      <h3 className="text-sm font-semibold text-white mb-3">Каталог объектов</h3>
      <div className="grid grid-cols-2 gap-2">
        {catalogItems.map((item) => (
          <DraggableItem key={item.type} item={item} />
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-3">Перетащите объект на сцену</p>

      {/* Custom Models */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">3D Модели</h3>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white rounded transition-colors"
            title="Загрузить GLB/GLTF модель"
          >
            {uploading ? '...' : '+ GLB'}
          </button>
        </div>

        {uploadError && (
          <div className="text-xs text-red-400 mb-2">{uploadError}</div>
        )}

        {models.length === 0 ? (
          <p className="text-xs text-gray-500">Нет загруженных моделей</p>
        ) : (
          <div className="space-y-1">
            {models.map((asset) => (
              <ModelItem key={asset.filename} asset={asset} />
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleModelUpload(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
