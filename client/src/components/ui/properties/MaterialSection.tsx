/**
 * Секция Material для редактирования материала объекта
 * Включает color picker, слайдеры metalness/roughness и загрузку текстуры
 */

import { useRef, useState } from 'react';
import type { SceneObjectData } from '@shared/types/scene';
import { uploadAsset } from '@/api/assetsApi';
import { toast } from '@/store/useToastStore';

interface MaterialSectionProps {
  object: SceneObjectData;
  onUpdate: (id: string, updates: Partial<SceneObjectData>) => void;
}

export function MaterialSection({ object, onUpdate }: MaterialSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMaterialChange = (updates: Partial<typeof object.material>) => {
    onUpdate(object.id, {
      material: { ...object.material, ...updates },
    });
  };

  const handleTextureUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const asset = await uploadAsset(file);
      handleMaterialChange({ textureUrl: asset.url });
      toast.success('Текстура загружена');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка загрузки';
      setUploadError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveTexture = () => {
    handleMaterialChange({ textureUrl: undefined });
  };

  return (
    <div className="mb-4 pb-4 border-b border-gray-700">
      <h3 className="text-white font-medium text-sm mb-3">Material</h3>

      {/* Color */}
      <div className="mb-3">
        <label className="block text-gray-400 text-xs mb-2">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={object.material.color}
            onChange={(e) => handleMaterialChange({ color: e.target.value })}
            className="w-12 h-8 rounded border border-gray-600 cursor-pointer bg-gray-700"
          />
          <input
            type="text"
            value={object.material.color}
            onChange={(e) => handleMaterialChange({ color: e.target.value })}
            className="flex-1 bg-gray-700 text-white px-3 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm font-mono"
            placeholder="#ffffff"
          />
        </div>
      </div>

      {/* Metalness */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Metalness</label>
          <span className="text-white text-xs">{object.material.metalness.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={object.material.metalness}
          onChange={(e) => handleMaterialChange({ metalness: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Roughness */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <label className="text-gray-400 text-xs">Roughness</label>
          <span className="text-white text-xs">{object.material.roughness.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={object.material.roughness}
          onChange={(e) => handleMaterialChange({ roughness: parseFloat(e.target.value) })}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Текстура */}
      <div>
        <label className="block text-gray-400 text-xs mb-2">Текстура</label>

        {object.material.textureUrl ? (
          <div className="flex items-center gap-2">
            <img
              src={object.material.textureUrl}
              alt="texture"
              className="w-12 h-12 rounded object-cover border border-gray-600 bg-gray-900"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-300 truncate">{object.material.textureUrl}</div>
              <button
                onClick={handleRemoveTexture}
                className="mt-1 text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Удалить текстуру
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-300 rounded border border-gray-600 border-dashed transition-colors"
          >
            {uploading ? 'Загрузка...' : '+ Загрузить текстуру (PNG, JPG)'}
          </button>
        )}

        {uploadError && (
          <div className="mt-1 text-xs text-red-400">{uploadError}</div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleTextureUpload(file);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}
