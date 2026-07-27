import { useRef } from 'react'
import { Edges } from '@react-three/drei'
// Aliased because the Wall component below already takes a `color` prop.
import { color as palette } from '../../theme'

// A single room rendered in 3D.
// Each wall, floor, and ceiling is a separate "mesh" — a 3D box with a color/material on it.

const WALL_HEIGHT = 3      // how tall the walls are (in metres)
const WALL_THICKNESS = 0.1 // how thick the walls are

// Each wall is pulled fully inside its own room's footprint by half its
// thickness, instead of being centered on the boundary line. Two rooms drawn
// edge-to-edge then end up with two separate, touching wall slabs rather than
// one wall box shared (and exactly overlapping) between them — which used to
// cause z-fighting where the shared wall would flicker or show the wrong
// room's color depending on camera angle.
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
      {/* BoxGeometry takes width, height, depth */}
      <boxGeometry args={size} />
      {/* meshStandardMaterial is a realistic material that responds to light */}
      <meshStandardMaterial color={color} />
    </mesh>
  )
}

export default function Room3D({ room, isSelected, onClick }) {
  const { width, height, x, y, wallColor, floorColor } = room

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
        <meshStandardMaterial color={palette.ceiling} />
      </mesh>

      {/* All four walls keep the room's own colour whether or not it's
          selected — selection is shown with the outline below instead, so you
          can still judge the colour you picked while editing it. */}

      {/* Front wall */}
      <Wall
        position={[0, WALL_HEIGHT / 2, height / 2 - WALL_INSET]}
        rotation={[0, 0, 0]}
        size={[width, WALL_HEIGHT, WALL_THICKNESS]}
        color={wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      {/* Back wall */}
      <Wall
        position={[0, WALL_HEIGHT / 2, -height / 2 + WALL_INSET]}
        rotation={[0, Math.PI, 0]}
        size={[width, WALL_HEIGHT, WALL_THICKNESS]}
        color={wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      {/* Left wall */}
      <Wall
        position={[-width / 2 + WALL_INSET, WALL_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[height, WALL_HEIGHT, WALL_THICKNESS]}
        color={wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      {/* Right wall */}
      <Wall
        position={[width / 2 - WALL_INSET, WALL_HEIGHT / 2, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        size={[height, WALL_HEIGHT, WALL_THICKNESS]}
        color={wallColor}
        roomId={room.id}
        onClick={onClick}
      />

      {/* Selection outline — an invisible box whose edges are drawn in blue.
          raycast is disabled so it never swallows clicks meant for the walls. */}
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
