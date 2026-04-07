/**
 * Главный компонент 3D-сцены
 * Canvas с базовыми настройками, освещением, сеткой и управлением камерой
 * Рендерит объекты из Zustand store
 */

import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid } from './Grid';
import { Lights } from './Lights';
import { CameraControls } from './CameraControls';
import { SceneObject } from './SceneObject';
import { TransformGizmo } from './TransformGizmo';
import { CanvasDropZone } from '../ui/CanvasDropTarget';
import { useSceneStore } from '@/store/useSceneStore';
import { useEditorStore } from '@/store/useEditorStore';
import type { ScreenshotHandle } from '@/hooks/useScreenshot';

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
    const [isDraggingGizmo, setIsDraggingGizmo] = useState(false);

    return (
      <Canvas
        shadows
        camera={{
          position: [5, 5, 5],
          fov: 50,
        }}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true, // Необходимо для toDataURL()
        }}
        style={{ background: '#1a1a1a' }}
      >
        {/* Компонент для скриншотов */}
        <ScreenshotCapture ref={screenshotRef} />

        {/* Освещение */}
        <Lights />

        {/* Сетка пола (условно отображается) */}
        {showGrid && <Grid />}

        {/* Управление камерой */}
        <CameraControls enabled={!isDraggingGizmo} />

        {/* Drop zone для drag & drop */}
        <CanvasDropZone />

        {/* Transform Gizmo */}
        <TransformGizmo
          onDragStart={() => setIsDraggingGizmo(true)}
          onDragEnd={() => setIsDraggingGizmo(false)}
        />

        {/* Объекты сцены из store */}
        {objects.map((obj) => {
          // Не рендерим выбранный объект - он рендерится в TransformGizmo
          if (obj.id === selectedId) return null;

          return (
            <SceneObject
              key={obj.id}
              data={obj}
              isSelected={false}
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
