import { useRef } from 'react'
import useHouseStore from '../../store/useHouseStore'

// A single room rendered in 3D.
// Each wall, floor, and ceiling is a separate "mesh" — a 3D box with a color/material on it.

const WALL_HEIGHT = 3      // how tall the walls are (in metres)
const WALL_THICKNESS = 0.1 // how thick the walls are

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
      {/* BoxGeometry takes width, height, depth */}
      <boxGeometry args={size} />
      {/* meshStandardMaterial is a realistic material that responds to light */}
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export default function Room3D({ room, isSelected, onClick }) {
  const { width, height, x, y, wallColor, floorColor, name } = room

  // Convert 2D floor plan coordinates to 3D world coordinates
  const posX = x + width / 2
  const posZ = y + height / 2

  return (
    <group position={[posX, 0, posZ]}>
      {/* Floor */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(room.id) }}
      >
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>

      {/* Ceiling */}
      <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#f9f9f9" />
      </mesh>

      {/* Front wall */}
      <Wall
        position={[0, WALL_HEIGHT / 2, height / 2]}
        rotation={[0, 0, 0]}
        size={[width, WALL_HEIGHT, WALL_THICKNESS]}
        color={isSelected ? '#a8d8ea' : wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      {/* Back wall */}
      <Wall
        position={[0, WALL_HEIGHT / 2, -height / 2]}
        rotation={[0, Math.PI, 0]}
        size={[width, WALL_HEIGHT, WALL_THICKNESS]}
        color={isSelected ? '#a8d8ea' : wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      {/* Left wall */}
      <Wall
        position={[-width / 2, WALL_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[height, WALL_HEIGHT, WALL_THICKNESS]}
        color={isSelected ? '#a8d8ea' : wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      {/* Right wall */}
      <Wall
        position={[width / 2, WALL_HEIGHT / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[height, WALL_HEIGHT, WALL_THICKNESS]}
        color={isSelected ? '#a8d8ea' : wallColor}
        roomId={room.id}
        onClick={onClick}
      />
    </group>
  )
}
