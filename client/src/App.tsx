/**
 * Главный компонент приложения
 *
 * Desktop (≥1200px): sidebar (256px) + canvas + properties panel (320px)
 * Tablet  (768–1199px): сворачиваемый sidebar + canvas + сворачиваемая панель
 * Mobile  (<768px): fullscreen canvas + bottom sheet панели + MobileToolbar
 */

import { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { SceneView } from './components/canvas/SceneView';
import { ObjectCatalog } from './components/ui/ObjectCatalog';
import { SceneHierarchy } from './components/ui/SceneHierarchy';
import { CanvasDropTarget } from './components/ui/CanvasDropTarget';
import { Toolbar } from './components/ui/Toolbar';
import { MobileToolbar } from './components/ui/MobileToolbar';
import { PropertiesPanel } from './components/ui/PropertiesPanel';
import { SaveLoadDialog } from './components/ui/SaveLoadDialog';
import { HotkeyDialog } from './components/ui/HotkeyDialog';
import { useEditorStore } from './store/useEditorStore';
import { useSceneStore } from './store/useSceneStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useScreenshot } from './hooks/useScreenshot';
import { useBreakpoint } from './hooks/useBreakpoint';
import { exportSceneToJson, importSceneFromJson } from './utils/sceneSerializer';
import { toast } from './store/useToastStore';
import { ToastContainer } from './components/ui/ToastContainer';
import { SceneErrorBoundary } from './components/canvas/SceneErrorBoundary';

type DialogMode = 'save' | 'load' | null;

function App() {
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const showGrid = useEditorStore((state) => state.showGrid);
  const objects = useSceneStore((state) => state.objects);
  const loadObjects = useSceneStore((state) => state.loadObjects);
  const selectedId = useSceneStore((state) => state.selectedId);

  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const isTablet = bp === 'tablet';

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [hotkeyOpen, setHotkeyOpen] = useState(false);
  // Tablet: открыт/закрыт сайдбар и панель свойств
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  // Mobile: какой bottom sheet открыт ('catalog' | 'properties' | null)
  const [bottomSheet, setBottomSheet] = useState<'catalog' | 'properties' | null>(null);

  const { screenshotRef, takeScreenshot, getThumbnail } = useScreenshot();

  const openSave = useCallback(() => setDialogMode('save'), []);
  const openLoad = useCallback(() => setDialogMode('load'), []);
  const closeDialog = useCallback(() => setDialogMode(null), []);

  const handleExportJson = useCallback(() => exportSceneToJson(objects), [objects]);

  const handleImportJson = useCallback(
    async (file: File) => {
      const imported = await importSceneFromJson(file);
      if (imported) {
        loadObjects(imported);
        toast.success(`Сцена импортирована из ${file.name}`);
      } else {
        toast.error('Не удалось прочитать JSON-файл');
      }
    },
    [loadObjects],
  );

  // Mobile: toggle bottom sheets
  const toggleCatalog = useCallback(() => {
    setBottomSheet((prev) => (prev === 'catalog' ? null : 'catalog'));
  }, []);

  const toggleProperties = useCallback(() => {
    setBottomSheet((prev) => (prev === 'properties' ? null : 'properties'));
  }, []);

  const openHotkeys = useCallback(() => setHotkeyOpen(true), []);
  const closeHotkeys = useCallback(() => setHotkeyOpen(false), []);

  useKeyboardShortcuts({ onSave: openSave, onLoad: openLoad, onHotkeys: openHotkeys });

  // ─── Sidebar content (shared между desktop и tablet) ─────────────────────
  const sidebarContent = (
    <>
      <ObjectCatalog />
      <div className="mt-4 pt-4 border-t border-gray-700">
        <SceneHierarchy />
      </div>
      <div className="p-4 pt-4 border-t border-gray-700">
        <button
          onClick={toggleGrid}
          className="w-full px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          {showGrid ? '✓ ' : ''}Показать сетку
        </button>
      </div>
    </>
  );

  // ─── MOBILE layout ────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="h-screen flex flex-col overflow-hidden bg-gray-900">
          {/* Fullscreen canvas */}
          <div className="flex-1 relative">
            <SceneErrorBoundary>
              <SceneView screenshotRef={screenshotRef} />
            </SceneErrorBoundary>
          </div>

          {/* Bottom sheet: каталог */}
          {bottomSheet === 'catalog' && (
            <div className="absolute bottom-24 left-0 right-0 bg-gray-800 border-t border-gray-700 max-h-[55vh] overflow-y-auto z-10 rounded-t-xl shadow-2xl">
              <div className="w-10 h-1 bg-gray-600 rounded mx-auto mt-2 mb-1" />
              {sidebarContent}
            </div>
          )}

          {/* Bottom sheet: свойства */}
          {bottomSheet === 'properties' && selectedId && (
            <div className="absolute bottom-24 left-0 right-0 bg-gray-800 border-t border-gray-700 max-h-[55vh] overflow-y-auto z-10 rounded-t-xl shadow-2xl">
              <div className="w-10 h-1 bg-gray-600 rounded mx-auto mt-2 mb-1" />
              <PropertiesPanel bare />
            </div>
          )}

          {/* Мобильный тулбар */}
          <MobileToolbar
            onSave={openSave}
            onLoad={openLoad}
            onScreenshot={takeScreenshot}
            onToggleCatalog={toggleCatalog}
            onToggleProperties={toggleProperties}
            catalogOpen={bottomSheet === 'catalog'}
            propertiesOpen={bottomSheet === 'properties'}
          />
        </div>

        {dialogMode && (
          <SaveLoadDialog mode={dialogMode} onClose={closeDialog} getThumbnail={getThumbnail} />
        )}
        {hotkeyOpen && <HotkeyDialog onClose={closeHotkeys} />}
        <ToastContainer />
      </DndProvider>
    );
  }

  // ─── TABLET layout ────────────────────────────────────────────────────────
  if (isTablet) {
    return (
      <DndProvider backend={HTML5Backend}>
        <div className="h-screen flex overflow-hidden bg-gray-900">
          {/* Сворачиваемый sidebar */}
          <aside
            className={`bg-gray-800 border-r border-gray-700 flex flex-col transition-all duration-200 overflow-hidden ${
              sidebarOpen ? 'w-64' : 'w-0'
            }`}
          >
            <div className="w-64 flex flex-col h-full">
              <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                <h1 className="text-lg font-bold text-white">3D Scene Editor</h1>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
            </div>
          </aside>

          {/* Canvas + Toolbar */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {/* Верхняя полоса с кнопкой открытия сайдбара */}
            <div className="absolute top-2 left-2 z-10 flex gap-2">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="px-3 py-2 bg-gray-800/90 backdrop-blur-sm text-white rounded-lg border border-gray-700 text-sm"
                  title="Открыть каталог"
                >
                  ☰
                </button>
              )}
            </div>

            <CanvasDropTarget>
              <Toolbar
                onSave={openSave}
                onLoad={openLoad}
                onScreenshot={takeScreenshot}
                onExportJson={handleExportJson}
                onImportJson={handleImportJson}
                onHotkeys={openHotkeys}
              />
              <SceneErrorBoundary>
                <SceneView screenshotRef={screenshotRef} />
              </SceneErrorBoundary>
            </CanvasDropTarget>
          </div>

          {/* Сворачиваемая панель свойств */}
          <aside
            className={`bg-gray-800 border-l border-gray-700 flex flex-col transition-all duration-200 overflow-hidden ${
              propertiesOpen ? 'w-80' : 'w-0'
            }`}
          >
            <div className="w-80 h-full overflow-y-auto">
              <PropertiesPanel bare />
            </div>
          </aside>

          {/* Кнопка свойств — появляется при выделении */}
          {selectedId && !propertiesOpen && (
            <button
              onClick={() => setPropertiesOpen(true)}
              className="fixed right-2 top-1/2 -translate-y-1/2 z-10 px-2 py-3 bg-gray-800/90 backdrop-blur-sm text-white rounded-lg border border-gray-700 text-sm"
              title="Свойства объекта"
            >
              ⚙
            </button>
          )}
          {propertiesOpen && (
            <button
              onClick={() => setPropertiesOpen(false)}
              className="fixed right-[calc(20rem+8px)] top-2 z-10 px-2 py-1 bg-gray-800/90 text-gray-400 hover:text-white rounded border border-gray-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {dialogMode && (
          <SaveLoadDialog mode={dialogMode} onClose={closeDialog} getThumbnail={getThumbnail} />
        )}
        {hotkeyOpen && <HotkeyDialog onClose={closeHotkeys} />}
        <ToastContainer />
      </DndProvider>
    );
  }

  // ─── DESKTOP layout ───────────────────────────────────────────────────────
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex overflow-hidden bg-gray-900">
        {/* Левый сайдбар */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">3D Scene Editor</h1>
            <p className="text-xs text-gray-400 mt-1">Этап 12: Мобильная адаптация</p>
          </div>
          <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
        </aside>

        {/* Canvas */}
        <CanvasDropTarget>
          <Toolbar
            onSave={openSave}
            onLoad={openLoad}
            onScreenshot={takeScreenshot}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onHotkeys={openHotkeys}
          />
          <SceneErrorBoundary>
            <SceneView screenshotRef={screenshotRef} />
          </SceneErrorBoundary>
        </CanvasDropTarget>

        {/* Правая панель */}
        <PropertiesPanel />

        {dialogMode && (
          <SaveLoadDialog mode={dialogMode} onClose={closeDialog} getThumbnail={getThumbnail} />
        )}
        <ToastContainer />
      </div>
    </DndProvider>
  );
}

export default App;
