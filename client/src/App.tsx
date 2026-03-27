/**
 * Главный компонент приложения
 * Layout: Sidebar (250px) + Canvas (flex) + Properties Panel (300px)
 */

import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SceneView } from './components/canvas/SceneView';
import { ObjectCatalog } from './components/ui/ObjectCatalog';
import { SceneHierarchy } from './components/ui/SceneHierarchy';
import { CanvasDropTarget } from './components/ui/CanvasDropTarget';
import { Toolbar } from './components/ui/Toolbar';
import { PropertiesPanel } from './components/ui/PropertiesPanel';
import { useEditorStore } from './store/useEditorStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const showGrid = useEditorStore((state) => state.showGrid);

  // Подключаем горячие клавиши
  useKeyboardShortcuts();

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex overflow-hidden bg-gray-900">
        {/* Левый сайдбар - Object Catalog */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">3D Scene Editor</h1>
            <p className="text-xs text-gray-400 mt-1">Этап 7: Undo/Redo</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {/* Каталог объектов с drag & drop */}
            <ObjectCatalog />

            {/* Иерархия сцены */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <SceneHierarchy />
            </div>

            {/* Настройки сцены */}
            <div className="p-4 pt-4 border-t border-gray-700">
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
        <CanvasDropTarget>
          <Toolbar />
          <SceneView />
        </CanvasDropTarget>

        {/* Правая панель - Properties */}
        <PropertiesPanel />
      </div>
    </DndProvider>
  );
}

export default App;
