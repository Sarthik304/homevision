import { useMemo } from 'react'
import { Edges } from '@react-three/drei'
import useHouseStore from '../../store/useHouseStore'
import { getColors } from '../../theme'

const WALL_HEIGHT = 3
const WALL_THICKNESS = 0.1
const WALL_INSET = WALL_THICKNESS / 2
const DOOR_HEIGHT = 2.1
const WINDOW_SILL = 0.9
const EPS = 0.001

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }

function computeOpenings(length, doors, windows) {
  const openings = []

  doors.forEach((d) => {
    const w = Math.min(d.width, length)
    const start = Math.max(0, d.offset * length - w / 2)
    const end = Math.min(length, start + w)
    openings.push({ start, end, bottom: 0, top: DOOR_HEIGHT, type: 'door' })
  })

  windows.forEach((win) => {
    const w = Math.min(win.width, length)
    const start = Math.max(0, win.offset * length - w / 2)
    const end = Math.min(length, start + w)
    // A tall window pushes its sill down toward the floor rather than
    // getting truncated at the top, so the requested height is honoured
    // up to the wall's own height.
    const requestedHeight = Math.min(win.height, WALL_HEIGHT)
    const top = Math.min(WALL_HEIGHT, WINDOW_SILL + requestedHeight)
    const bottom = Math.max(0, top - requestedHeight)
    openings.push({ start, end, bottom, top, type: 'window' })
  })

  return openings
}

// Splits a wall's length x height rectangle into solid boxes that avoid the
// door/window openings cut into it.
function buildSolidSegments(length, openings) {
  const bounds = new Set([0, length])
  openings.forEach((o) => {
    bounds.add(Math.max(0, Math.min(length, o.start)))
    bounds.add(Math.max(0, Math.min(length, o.end)))
  })
  const sorted = Array.from(bounds).sort((a, b) => a - b)

  const segments = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const xa = sorted[i]
    const xb = sorted[i + 1]
    if (xb - xa < EPS) continue
    const mid = (xa + xb) / 2

    const blocked = openings
      .filter((o) => o.start <= mid && o.end >= mid)
      .map((o) => [o.bottom, o.top])
      .sort((a, b) => a[0] - b[0])

    const merged = []
    blocked.forEach(([b, t]) => {
      const last = merged[merged.length - 1]
      if (last && b <= last[1] + EPS) {
        last[1] = Math.max(last[1], t)
      } else {
        merged.push([b, t])
      }
    })

    let cursor = 0
    merged.forEach(([b, t]) => {
      if (b - cursor > EPS) segments.push({ x: xa, w: xb - xa, y: cursor, h: b - cursor })
      cursor = Math.max(cursor, t)
    })
    if (WALL_HEIGHT - cursor > EPS) {
      segments.push({ x: xa, w: xb - xa, y: cursor, h: WALL_HEIGHT - cursor })
    }
  }
  return segments
}

function WallWithOpenings({ length, position, rotation, color, glassColor, roomId, onClick, doors, windows }) {
  const openings = useMemo(() => computeOpenings(length, doors, windows), [length, doors, windows])
  const segments = useMemo(() => buildSolidSegments(length, openings), [length, openings])
  const windowOpenings = openings.filter((o) => o.type === 'window')

  const handleClick = (e) => {
    e.stopPropagation()
    onClick(roomId)
  }

  return (
    <group position={position} rotation={rotation}>
      {segments.map((seg, i) => (
        <mesh
          key={i}
          position={[seg.x + seg.w / 2 - length / 2, seg.y + seg.h / 2, 0]}
          onClick={handleClick}
        >
          <boxGeometry args={[seg.w, seg.h, WALL_THICKNESS]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      {windowOpenings.map((win, i) => (
        <mesh
          key={`glass-${i}`}
          position={[(win.start + win.end) / 2 - length / 2, (win.bottom + win.top) / 2, 0]}
          onClick={handleClick}
        >
          <boxGeometry args={[win.end - win.start, win.top - win.bottom, WALL_THICKNESS * 0.4]} />
          <meshStandardMaterial color={glassColor} transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  )
}

export default function Room3D({ room, isSelected, onClick }) {
  const darkMode = useHouseStore((s) => s.darkMode)
  const palette = getColors(darkMode)
  const { width, height, x, y, wallColor, floorColor } = room
  const walls = room.walls ?? DEFAULT_WALLS
  const doors = room.doors ?? []
  const windows = room.windows ?? []
  const anyWalls = Object.values(walls).some(Boolean)

  const posX = x + width / 2
  const posZ = y + height / 2

  const wallDefs = [
    { key: 'bottom', length: width, position: [0, 0, height / 2 - WALL_INSET], rotation: [0, 0, 0] },
    { key: 'top', length: width, position: [0, 0, -height / 2 + WALL_INSET], rotation: [0, Math.PI, 0] },
    { key: 'left', length: height, position: [-width / 2 + WALL_INSET, 0, 0], rotation: [0, Math.PI / 2, 0] },
    { key: 'right', length: height, position: [width / 2 - WALL_INSET, 0, 0], rotation: [0, -Math.PI / 2, 0] },
  ]

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

      {anyWalls && (
        <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color={palette.ceiling} />
        </mesh>
      )}

      {wallDefs
        .filter((w) => walls[w.key])
        .map((w) => (
          <WallWithOpenings
            key={w.key}
            length={w.length}
            position={w.position}
            rotation={w.rotation}
            color={wallColor}
            glassColor={palette.glass}
            roomId={room.id}
            onClick={onClick}
            doors={doors.filter((d) => d.wall === w.key)}
            windows={windows.filter((win) => win.wall === w.key)}
          />
        ))}

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
