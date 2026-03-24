/**
 * Главный компонент приложения
 * Layout: Sidebar (250px) + Canvas (flex) + Properties Panel (300px)
 */

import { SceneView } from './components/canvas/SceneView';
import { useSceneStore } from './store/useSceneStore';
import { useEditorStore } from './store/useEditorStore';
import type { ObjectType } from '@shared/types/scene';

function App() {
  const addObject = useSceneStore((state) => state.addObject);
  const removeObject = useSceneStore((state) => state.removeObject);
  const deselectAll = useSceneStore((state) => state.deselectAll);
  const objects = useSceneStore((state) => state.objects);
  const selectedId = useSceneStore((state) => state.selectedId);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const showGrid = useEditorStore((state) => state.showGrid);

  const objectTypes: { type: ObjectType; label: string }[] = [
    { type: 'box', label: 'Куб' },
    { type: 'sphere', label: 'Сфера' },
    { type: 'cylinder', label: 'Цилиндр' },
    { type: 'cone', label: 'Конус' },
    { type: 'plane', label: 'Плоскость' },
    { type: 'torus', label: 'Тор' },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-900">
      {/* Левый сайдбар - Object Catalog */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">3D Scene Editor</h1>
          <p className="text-xs text-gray-400 mt-1">Этап 2: Zustand Store</p>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-white mb-2">Добавить объект</h3>
          <div className="space-y-2">
            {objectTypes.map(({ type, label }) => (
              <button
                key={type}
                onClick={() => addObject(type)}
                className="w-full px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                + {label}
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-white mb-2">
              Объекты сцены ({objects.length})
            </h3>
            {objects.length === 0 ? (
              <p className="text-xs text-gray-400">Сцена пуста</p>
            ) : (
              <div className="space-y-1">
                {objects.map((obj) => (
                  <div
                    key={obj.id}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      obj.id === selectedId ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <span className="truncate flex-1">{obj.name}</span>
                    <button
                      onClick={() => removeObject(obj.id)}
                      className="ml-2 px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={toggleGrid}
              className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              {showGrid ? '✓ ' : ''}Показать сетку
            </button>
          </div>
        </div>
      </aside>

      {/* Центральная часть - 3D Canvas */}
      <main className="flex-1 relative">
        <SceneView />
      </main>

      {/* Правая панель - Properties */}
      <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Свойства</h2>
        </div>
        <div className="flex-1 p-4">
          {selectedId ? (
            <div>
              <p className="text-sm text-gray-300 mb-3">
                Выбран объект: {objects.find((o) => o.id === selectedId)?.name}
              </p>
              <button
                onClick={deselectAll}
                className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Снять выделение
              </button>
              <p className="text-xs text-gray-400 mt-4">
                Панель свойств будет добавлена на Этапе 5
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Выберите объект для просмотра свойств</p>
          )}
        </div>
      </aside>
    </div>
  );
}

export default App;
