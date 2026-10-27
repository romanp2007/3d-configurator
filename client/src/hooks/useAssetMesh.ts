/**
 * Хук загрузки меша-ассета (assets/assetLibrary.ts). Возвращает null, пока
 * ассет грузится (или при ошибке — тогда error заполнен).
 */

import { useEffect, useState } from 'react';
import { getLoadedAssetMesh, loadAssetMesh, type LoadedAssetMesh } from '@/assets/assetLibrary';

export function useAssetMesh(assetId: string | undefined): { mesh: LoadedAssetMesh | null; error: string | null } {
  const [state, setState] = useState<{ id: string; mesh: LoadedAssetMesh | null; error: string | null } | null>(
    () => {
      const cached = assetId ? getLoadedAssetMesh(assetId) : undefined;
      return cached && assetId ? { id: assetId, mesh: cached, error: null } : null;
    },
  );

  useEffect(() => {
    if (!assetId) return;
    if (state?.id === assetId && state.mesh) return;
    let cancelled = false;
    loadAssetMesh(assetId)
      .then((mesh) => !cancelled && setState({ id: assetId, mesh, error: null }))
      .catch((e) => !cancelled && setState({ id: assetId, mesh: null, error: e instanceof Error ? e.message : String(e) }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  if (!assetId || !state || state.id !== assetId) return { mesh: null, error: null };
  return { mesh: state.mesh, error: state.error };
}
