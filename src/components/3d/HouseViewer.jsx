import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import Room3D from './Room3D'
import useHouseStore from '../../store/useHouseStore'
import { color } from '../../theme'

export default function HouseViewer() {
  const { rooms, selectedRoomId, selectRoom } = useHouseStore()

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [20, 20, 20],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows
      >
        <color attach="background" args={[color.workspace]} />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={1}
          castShadow
        />

        <Environment preset="apartment" />

        <Grid
          args={[100, 100]}
          position={[0, -0.01, 0]}
          cellColor={color.gridCell}
          sectionColor={color.gridSection}
        />

        {rooms.map((room) => (
          <Room3D
            key={room.id}
            room={room}
            isSelected={room.id === selectedRoomId}
            onClick={selectRoom}
          />
        ))}

        <mesh
          position={[0, -0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={() => selectRoom(null)}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>

        <OrbitControls
          makeDefault
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  )
}
