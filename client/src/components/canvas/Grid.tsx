/**
 * Компонент сетки пола
 * Отображает grid helper для ориентации в 3D-пространстве
 */

export function Grid() {
  return <gridHelper args={[20, 20, 0x444444, 0x222222]} position={[0, 0, 0]} />;
}
