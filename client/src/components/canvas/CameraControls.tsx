/**
 * Компонент управления камерой
 * OrbitControls для вращения, зума и панорамы с поддержкой touch-устройств
 */

import { OrbitControls } from '@react-three/drei';

interface CameraControlsProps {
  enabled?: boolean;
}

export function CameraControls({ enabled = true }: CameraControlsProps) {
  return (
    <OrbitControls
      makeDefault
      enabled={enabled}
      // Настройки зума
      minDistance={2}
      maxDistance={50}
      // Настройки вращения (ограничение угла по вертикали)
      maxPolarAngle={Math.PI / 2}
      // Touch-поддержка включена по умолчанию
      enableDamping
      dampingFactor={0.05}
      // Скорость вращения
      rotateSpeed={0.5}
      // Скорость зума
      zoomSpeed={0.8}
      // Панорама правой кнопкой мыши или двумя пальцами
      enablePan
      panSpeed={0.5}
    />
  );
}
