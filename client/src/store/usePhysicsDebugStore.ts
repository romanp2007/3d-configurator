/**
 * Состояние просмотра физ-данных сцены (Этап 4b, view-only): загруженная
 * seam_collection.json и переключатели видимости оверлея (швы/закреплённые
 * точки). См. wiki/plans/3d_configurator_integration.md.
 *
 * Отдельно от useSceneStore специально — seam_collection.json не входит в
 * SceneObjectData (данные сцены, а не объекта) и НЕ должна писаться в
 * zundo-историю или сериализоваться при экспорте/сохранении сцены.
 */

import { create } from 'zustand';
import type { SeamCollection } from '@/api/physicsSceneApi';

interface PhysicsDebugStore {
  seamCollection: SeamCollection | null;
  showSeams: boolean;
  showFixedPoints: boolean;

  setSeamCollection: (collection: SeamCollection | null) => void;
  toggleShowSeams: () => void;
  toggleShowFixedPoints: () => void;
}

export const usePhysicsDebugStore = create<PhysicsDebugStore>((set) => ({
  seamCollection: null,
  showSeams: false,
  showFixedPoints: false,

  setSeamCollection: (collection) => set({ seamCollection: collection }),
  toggleShowSeams: () => set((s) => ({ showSeams: !s.showSeams })),
  toggleShowFixedPoints: () => set((s) => ({ showFixedPoints: !s.showFixedPoints })),
}));
