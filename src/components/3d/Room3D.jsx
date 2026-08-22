import { useMemo, useRef } from 'react'
import { Shape } from 'three'
import { Edges } from '@react-three/drei'
import useHouseStore from '../../store/useHouseStore'
import { getColors } from '../../theme'
import { getLPolygon } from '../../constants/lshape'
import { getLWallDefs, getRectWallDefs, WALL_THICKNESS } from '../../utils/wallGeometry'

const WALL_HEIGHT = 3
const DOOR_HEIGHT = 2.1
const WINDOW_SILL = 0.9
const EPS = 0.001

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }

// manual double-click detection (Safari/touch don't reliably fire native dblclick on canvas)
const DOUBLE_CLICK_MS = 350

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
    // tall windows push the sill down rather than getting truncated
    const requestedHeight = Math.min(win.height, WALL_HEIGHT)
    const top = Math.min(WALL_HEIGHT, WINDOW_SILL + requestedHeight)
    const bottom = Math.max(0, top - requestedHeight)
    openings.push({ start, end, bottom, top, type: 'window' })
  })

  return openings
}

// trims segment ends so adjacent walls butt-join instead of overlapping/z-fighting
function clipSegments(segments, trimStart, trimEnd, length) {
  const lo = trimStart
  const hi = length - trimEnd
  if (lo <= 0 && hi >= length) return segments
  return segments
    .map((seg) => {
      const xa = Math.max(seg.x, lo)
      const xb = Math.min(seg.x + seg.w, hi)
      if (xb - xa < EPS) return null
      return { ...seg, x: xa, w: xb - xa }
    })
    .filter(Boolean)
}

// splits a wall rectangle into solid boxes around its door/window openings
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

// flat L-shaped mesh used for floor/ceiling (`flipY` handles their opposite X rotations)
function buildLShape(width, height, notchWidth, notchHeight, flipY) {
  const points = getLPolygon(width, height, notchWidth, notchHeight)
  const shape = new Shape()
  points.forEach(({ x, y }, i) => {
    const sx = x - width / 2
    const sy = flipY ? height / 2 - y : y - height / 2
    if (i === 0) shape.moveTo(sx, sy)
    else shape.lineTo(sx, sy)
  })
  shape.closePath()
  return shape
}

function WallWithOpenings({ length, position, rotation, thickness = WALL_THICKNESS, trimStart = 0, trimEnd = 0, color, glassColor, roomId, wallKind, wallKey, onClick, onSelectWall, onWallDoubleClick, pickMode, onWallColorPick, doors, windows }) {
  const openings = useMemo(() => computeOpenings(length, doors, windows), [length, doors, windows])
  const segments = useMemo(
    () => clipSegments(buildSolidSegments(length, openings), trimStart, trimEnd, length),
    [length, openings, trimStart, trimEnd]
  )
  const windowOpenings = openings.filter((o) => o.type === 'window')
  const lastClickRef = useRef(0)

  const handleClick = (e) => {
    e.stopPropagation()

    if (pickMode) {
      onWallColorPick(roomId, wallKind, wallKey)
      return
    }

    onClick(roomId)
    onSelectWall(wallKind, wallKey)

    const now = performance.now()
    if (now - lastClickRef.current < DOUBLE_CLICK_MS) {
      lastClickRef.current = 0
      onWallDoubleClick(roomId, wallKind, wallKey, e.nativeEvent)
    } else {
      lastClickRef.current = now
    }
  }

  return (
    <group position={position} rotation={rotation}>
      {segments.map((seg, i) => (
        <mesh
          key={i}
          position={[seg.x + seg.w / 2 - length / 2, seg.y + seg.h / 2, 0]}
          onClick={handleClick}
        >
          <boxGeometry args={[seg.w, seg.h, thickness]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}

      {windowOpenings.map((win, i) => (
        <mesh
          key={`glass-${i}`}
          position={[(win.start + win.end) / 2 - length / 2, (win.bottom + win.top) / 2, 0]}
          onClick={handleClick}
        >
          <boxGeometry args={[win.end - win.start, win.top - win.bottom, thickness * 0.4]} />
          <meshStandardMaterial color={glassColor} transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  )
}

export default function Room3D({ room, isSelected, onClick, onSelectWall, onWallDoubleClick, pickMode, onWallColorPick }) {
  const darkMode = useHouseStore((s) => s.darkMode)
  const palette = getColors(darkMode)
  const { width, height, x, y, wallColor, floorColor } = room
  const isL = room.shape === 'L'
  const notchWidth = isL ? room.notchWidth : 0
  const notchHeight = isL ? room.notchHeight : 0
  const walls = room.walls ?? DEFAULT_WALLS
  const doors = room.doors ?? []
  const windows = room.windows ?? []
  const anyWalls = Object.values(walls).some(Boolean)

  const posX = x + width / 2
  const posZ = y + height / 2

  const floorShape = useMemo(
    () => (isL ? buildLShape(width, height, notchWidth, notchHeight, true) : null),
    [isL, width, height, notchWidth, notchHeight]
  )
  const ceilingShape = useMemo(
    () => (isL ? buildLShape(width, height, notchWidth, notchHeight, false) : null),
    [isL, width, height, notchWidth, notchHeight]
  )

  const wallDefs = isL ? getLWallDefs(width, height, notchWidth, notchHeight) : getRectWallDefs(width, height)

  return (
    <group position={[posX, 0, posZ]} rotation={[0, -((room.rotation ?? 0) * Math.PI) / 180, 0]}>
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={(e) => {
          e.stopPropagation()
          if (!pickMode) onClick(room.id)
        }}
      >
        {isL ? <shapeGeometry args={[floorShape]} /> : <planeGeometry args={[width, height]} />}
        <meshStandardMaterial color={floorColor} />
      </mesh>

      {anyWalls && (
        <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {isL ? <shapeGeometry args={[ceilingShape]} /> : <planeGeometry args={[width, height]} />}
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
            trimStart={w.trimStart}
            trimEnd={w.trimEnd}
            color={(room.wallColors ?? {})[w.key] ?? wallColor}
            glassColor={palette.glass}
            roomId={room.id}
            wallKind="boundary"
            wallKey={w.key}
            onClick={onClick}
            onSelectWall={onSelectWall}
            onWallDoubleClick={onWallDoubleClick}
            pickMode={pickMode}
            onWallColorPick={onWallColorPick}
            doors={doors.filter((d) => d.wall === w.key)}
            windows={windows.filter((win) => win.wall === w.key)}
          />
        ))}

      {(room.interiorWalls ?? []).map((wall) => {
        const dx = wall.x2 - wall.x1
        const dy = wall.y2 - wall.y1
        const wallLength = Math.hypot(dx, dy)
        if (wallLength < 0.01) return null
        const midX = (wall.x1 + wall.x2) / 2 - width / 2
        const midZ = (wall.y1 + wall.y2) / 2 - height / 2
        const angle = Math.atan2(-dy, dx)
        return (
          <WallWithOpenings
            key={wall.id}
            length={wallLength}
            position={[midX, 0, midZ]}
            rotation={[0, angle, 0]}
            thickness={wall.thickness}
            color={wall.color ?? wallColor}
            glassColor={palette.glass}
            roomId={room.id}
            wallKind="interior"
            wallKey={wall.id}
            onClick={onClick}
            onSelectWall={onSelectWall}
            onWallDoubleClick={onWallDoubleClick}
            pickMode={pickMode}
            onWallColorPick={onWallColorPick}
            doors={wall.doors ?? []}
            windows={wall.windows ?? []}
          />
        )
      })}

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
