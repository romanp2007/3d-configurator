/**
 * Библиотека мешей-ассетов, ВШИТЫХ в сборку клиента: OBJ-файлы из
 * wgpu_utils/tests/assets/obj подключаются на этапе сборки Vite через
 * import.meta.glob (каждый файл — отдельный ленивый чанк, загружается только
 * при первом добавлении на сцену). Серверные эндпоинты не нужны.
 *
 * Импорт меша: parseObj (только позиции и грани) → centered по центру AABB.
 * Для физики меш дополнительно склеивается (weldMesh: OBJ хранит копии вершин
 * под нормали/uv, и без общих рёбер ownership-коллизии работают неверно);
 * для рендера остаётся несклеенный (его нормали считаются как в исходнике).
 *
 * См. wiki/plans/3d_configurator_physics_objects.md, Этап 3.
 */

import { parseObj } from '@wgpu/utils/obj_loader';
import { boundsCenter, meshBounds, shiftMesh, weldMesh, type Vec3 } from '@wgpu/geometry/mesh_utils';
import type { MeshData } from '@wgpu/geometry/primitives';

// Путь — от этого файла: client/src/assets → корень wgpu_utils → tests/assets/obj.
const loaders = import.meta.glob('../../../../tests/assets/obj/*.obj', {
  query: '?raw',
  import: 'default',
}) as Record<string, () => Promise<string>>;

export interface AssetMeshInfo {
  /** Идентификатор = имя файла, например 'Wooden table 2.obj'. */
  id: string;
  /** Подпись для каталога (имя без расширения). */
  label: string;
}

export interface LoadedAssetMesh extends AssetMeshInfo {
  /** Несклеенный меш для рендера (центрирован по AABB, единицы исходного файла). */
  render: MeshData;
  /** Склеенный меш для физики (тот же центр). */
  collision: MeshData;
  /** Размер AABB в единицах файла. */
  size: Vec3;
  /** Рекомендуемый масштаб к метрам (OBJ в сантиметрах → 0.01). */
  defaultScale: number;
  vertexCount: number;
  triangleCount: number;
}

function idOf(globKey: string): string {
  return globKey.slice(globKey.lastIndexOf('/') + 1);
}

/** Список доступных ассетов (синхронный — собирается на этапе сборки). */
export function listAssetMeshes(): AssetMeshInfo[] {
  return Object.keys(loaders)
    .map((k) => {
      const id = idOf(k);
      return { id, label: id.replace(/\.obj$/i, '') };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Файлы в сантиметрах (SM_Bedroom_Set: 400×132) встречаются среди ассетов;
 * грубая эвристика — всё, что длиннее 50 единиц, считаем сантиметрами.
 */
function guessScale(size: Vec3): number {
  return Math.max(size[0], size[1], size[2]) > 50 ? 0.01 : 1;
}

const cache = new Map<string, Promise<LoadedAssetMesh>>();
const loaded = new Map<string, LoadedAssetMesh>();

export function loadAssetMesh(id: string): Promise<LoadedAssetMesh> {
  let p = cache.get(id);
  if (!p) {
    const key = Object.keys(loaders).find((k) => idOf(k) === id);
    if (!key) return Promise.reject(new Error(`Ассет "${id}" не найден в сборке`));
    p = loaders[key]().then((text) => {
      const raw = parseObj(text);
      if (raw.indices.length === 0) throw new Error(`Ассет "${id}": в OBJ нет граней`);
      const bounds = meshBounds(raw);
      const center = boundsCenter(bounds);
      const render = shiftMesh(raw, center);
      const collision = weldMesh(render);
      const size: Vec3 = [
        bounds.max[0] - bounds.min[0],
        bounds.max[1] - bounds.min[1],
        bounds.max[2] - bounds.min[2],
      ];
      const mesh: LoadedAssetMesh = {
        id,
        label: id.replace(/\.obj$/i, ''),
        render,
        collision,
        size,
        defaultScale: guessScale(size),
        vertexCount: collision.vertices.length / 3,
        triangleCount: collision.indices.length / 3,
      };
      loaded.set(id, mesh);
      return mesh;
    });
    // Неудачную загрузку не кэшируем — можно повторить.
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

/** Синхронный доступ к уже загруженному ассету (после loadAssetMesh); иначе undefined. */
export function getLoadedAssetMesh(id: string): LoadedAssetMesh | undefined {
  return loaded.get(id);
}
