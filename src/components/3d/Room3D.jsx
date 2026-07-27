import { useRef } from 'react'
import { Edges } from '@react-three/drei'
import { color as palette } from '../../theme'

const WALL_HEIGHT = 3
const WALL_THICKNESS = 0.1
const WALL_INSET = WALL_THICKNESS / 2

function Wall({ position, rotation, size, color, roomId, onClick }) {
  const meshRef = useRef()

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation()
        onClick(roomId)
      }}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export default function Room3D({ room, isSelected, onClick }) {
  const { width, height, x, y, wallColor, floorColor } = room

  const posX = x + width / 2
  const posZ = y + height / 2

  return (
    <group position={[posX, 0, posZ]}>
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(room.id) }}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>

      <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={palette.ceiling} />
      </mesh>

      <Wall
        position={[0, WALL_HEIGHT / 2, height / 2 - WALL_INSET]}
        rotation={[0, 0, 0]}
        size={[width, WALL_HEIGHT, WALL_THICKNESS]}
        color={wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      <Wall
        position={[0, WALL_HEIGHT / 2, -height / 2 + WALL_INSET]}
        rotation={[0, Math.PI, 0]}
        size={[width, WALL_HEIGHT, WALL_THICKNESS]}
        color={wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      <Wall
        position={[-width / 2 + WALL_INSET, WALL_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[height, WALL_HEIGHT, WALL_THICKNESS]}
        color={wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      <Wall
        position={[width / 2 - WALL_INSET, WALL_HEIGHT / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[height, WALL_HEIGHT, WALL_THICKNESS]}
        color={wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      {isSelected && (
        <mesh position={[0, WALL_HEIGHT / 2, 0]} raycast={() => null}>
          <boxGeometry args={[width, WALL_HEIGHT, height]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={palette.brand} lineWidth={2} />
        </mesh>
      )}
    </group>
  )
}
