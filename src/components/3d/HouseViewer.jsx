import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import Room3D from './Room3D'
import useHouseStore from '../../store/useHouseStore'
import { color } from '../../theme'

// HouseViewer is the full 3D canvas.
// Canvas = the browser window into the 3D world.
// OrbitControls = lets you rotate, zoom, pan with mouse/trackpad.
// Environment = adds realistic ambient lighting.

export default function HouseViewer() {
  const { rooms, selectedRoomId, selectRoom } = useHouseStore()

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [20, 20, 20], // where the camera starts
          fov: 50,                 // field of view (like zoom)
          near: 0.1,
          far: 1000,
        }}
        shadows
      >
        {/* Scene background. Lowercase <color> is the three.js element, not the
            token object imported above — it keeps the 3D void the same grey as
            the 2D canvas so switching views doesn't flash. */}
        <color attach="background" args={[color.workspace]} />

        {/* Lighting — without this everything would be pitch black */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
        />

        {/* Environment adds realistic reflections and ambient light */}
        <Environment preset="apartment" />

        {/* Grid on the floor so you can see scale */}
        <Grid
          args={[100, 100]}
          position={[0, -0.01, 0]}
          cellColor={color.gridCell}
          sectionColor={color.gridSection}
        />

        {/* Render every room */}
        {rooms.map((room) => (
          <Room3D
            key={room.id}
            room={room}
            isSelected={room.id === selectedRoomId}
            onClick={selectRoom}
          />
        ))}

        {/* Click on empty space to deselect */}
        <mesh
          position={[0, -0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={() => selectRoom(null)}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>

        {/* Camera controls — rotate, zoom, pan */}
        <OrbitControls
          makeDefault
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2}  // stops camera going underground
        />
      </Canvas>
    </div>
  )
}
