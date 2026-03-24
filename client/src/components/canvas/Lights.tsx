/**
 * Компонент освещения сцены
 * Ambient light для общего освещения + Directional light для теней
 */

export function Lights() {
  return (
    <>
      {/* Фоновое освещение */}
      <ambientLight intensity={0.5} />

      {/* Направленный свет с тенями */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Заполняющий свет снизу */}
      <hemisphereLight intensity={0.3} groundColor="#444444" />
    </>
  );
}
