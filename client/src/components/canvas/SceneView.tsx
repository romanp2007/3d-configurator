/**
 * Главный компонент 3D-сцены
 * Canvas с базовыми настройками, освещением, сеткой и управлением камерой
 * Рендерит объекты из Zustand store
 */

import { useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, extend, useThree } from '@react-three/fiber';
import type { ThreeToJSXElements } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { Grid } from './Grid';
import { Lights } from './Lights';
import { CameraControls } from './CameraControls';
import { SceneObject } from './SceneObject';
import { TransformGizmo } from './TransformGizmo';
import { PhysicsSimController } from './PhysicsSimController';
import { PhysicsDebugOverlay } from './PhysicsDebugOverlay';
import { CanvasDropZone } from '../ui/CanvasDropTarget';
import { useSceneStore } from '@/store/useSceneStore';
import { useEditorStore } from '@/store/useEditorStore';
import type { ScreenshotHandle } from '@/hooks/useScreenshot';

// Регистрируем JSX-интринзики из three/webgpu (WebGPURenderer + совместимые
// классы three, включая узловые материалы) вместо дефолтного каталога R3F
// (который тянет 'three', а не 'three/webgpu'). Без этого <mesh>/<boxGeometry>
// и т.д. не резолвятся при рендере через WebGPURenderer. См.
// wiki/plans/3d_configurator_integration.md, Этап 0.
declare module '@react-three/fiber' {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}
extend(THREE as unknown as Record<string, new (...args: unknown[]) => unknown>);

/**
 * Внутренний компонент — живёт внутри <Canvas>, имеет доступ к useThree
 * Экспонирует getDataUrl через ref
 */
const ScreenshotCapture = forwardRef<ScreenshotHandle>((_props, ref) => {
  const { gl } = useThree();

  useImperativeHandle(ref, () => ({
    getDataUrl: () => {
      // preserveDrawingBuffer должен быть true (задан в gl пропах Canvas)
      return gl.domElement.toDataURL('image/png');
    },
  }));

  return null;
});

ScreenshotCapture.displayName = 'ScreenshotCapture';

interface SceneViewProps {
  screenshotRef?: React.Ref<ScreenshotHandle>;
}

export const SceneView = forwardRef<ScreenshotHandle, SceneViewProps>(
  ({ screenshotRef }, _ref) => {
    const objects = useSceneStore((state) => state.objects);
    const selectedId = useSceneStore((state) => state.selectedId);
    const selectObject = useSceneStore((state) => state.selectObject);
    const showGrid = useEditorStore((state) => state.showGrid);
    const simMode = useEditorStore((state) => state.simMode);
    const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);
    const [isDragToolActive, setIsDragToolActive] = useState(false);

    return (
      <Canvas
        shadows
        camera={{
          position: [5, 5, 5],
          fov: 50,
        }}
        gl={async (props) => {
          // Async-конструктор обязателен для WebGPURenderer (R3F v9, см.
          // v9-migration-guide). WebGPURendererParameters НЕ знает
          // preserveDrawingBuffer (WebGL-специфичная опция) — useScreenshot.ts
          // (gl.domElement.toDataURL()) требует отдельной проверки/переделки
          // под WebGPU, см. открытый риск в
          // wiki/plans/3d_configurator_integration.md, Этап 0.
          const renderer = new THREE.WebGPURenderer({
            ...(props as ConstructorParameters<typeof THREE.WebGPURenderer>[0]),
            antialias: true,
            alpha: false,
          });
          await renderer.init();
          return renderer;
        }}
        style={{ background: '#1a1a1a' }}
      >
        {/* Компонент для скриншотов */}
        <ScreenshotCapture ref={screenshotRef} />

        {/* Освещение */}
        <Lights />

        {/* Сетка пола (условно отображается) */}
        {showGrid && <Grid />}

        {/* Управление камерой — также отключается, пока переключён режим
            drag-инструмента ткани (см. PhysicsSimController, DRAG_TOOL_KEY —
            повторное нажатие хоткея переключает обратно), иначе OrbitControls
            перехватывает мышь вместо перетаскивания. */}
        <CameraControls enabled={!isDraggingGizmo && !isDragToolActive} />

        {/* Drop zone для drag & drop */}
        <CanvasDropZone />

        {/* Physics-симуляция (Style3DSolverScene) — активна только при
            simMode === 'simulate', см. Этап 7 плана. Ничего не рендерит сама,
            пишет позиции напрямую в геометрию physicsMesh-объектов. */}
        <PhysicsSimController onDragToolActiveChange={setIsDragToolActive} />

        {/* Просмотр швов/закреплённых точек (Этап 4b) — переключатели в PhysicsSection */}
        <PhysicsDebugOverlay />

        {/* Transform Gizmo — скрыт во время симуляции (нечего двигать, солвер
            сам ведёт позиции) */}
        {simMode === 'edit' && (
          <TransformGizmo
            onDragStart={() => setIsDraggingGizmo(true)}
            onDragEnd={() => setIsDraggingGizmo(false)}
          />
        )}

        {/* Объекты сцены из store */}
        {objects.map((obj) => {
          // В edit-режиме выбранный объект не рендерим здесь — он рендерится
          // в TransformGizmo (с гизмо). В simulate-режиме гизмо не участвует
          // (см. выше) — рендерим ВСЕ объекты здесь как обычно, включая
          // выбранный, иначе он останется невидимым и вдобавок пересоздание
          // геометрии между TransformGizmo/обычным рендером сбросило бы
          // накопленную vertex-морф деформацию.
          if (obj.id === selectedId && simMode === 'edit') return null;

          return (
            <SceneObject
              key={obj.id}
              data={obj}
              isSelected={obj.id === selectedId}
              onClick={(e) => {
                e.stopPropagation();
                selectObject(obj.id);
              }}
            />
          );
        })}

        {/* Пол для теней */}
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#2a2a2a" />
        </mesh>
      </Canvas>
    );
  },
);

SceneView.displayName = 'SceneView';
