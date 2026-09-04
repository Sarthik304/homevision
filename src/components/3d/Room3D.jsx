import { useEffect, useMemo, useRef, useState } from 'react'
import { Plane, SRGBColorSpace, Shape, TextureLoader, Vector3 } from 'three'
import { Edges } from '@react-three/drei'
import useHouseStore from '../../store/useHouseStore'
import { getColors } from '../../theme'
import { getLPolygon } from '../../constants/lshape'
import { getQuadPolygon, quadCornersOf } from '../../constants/quad'
import { getLWallDefs, getQuadWallDefs, getRectWallDefs, wallInwardSign, WALL_THICKNESS } from '../../utils/wallGeometry'

const WALL_HEIGHT = 3
const DOOR_HEIGHT = 2.1
const WINDOW_SILL = 0.9
const EPS = 0.001

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }

// proportions for a sofa's seat/backrest/armrest breakdown, as fractions of its own bounding box
const SOFA_SEAT_HEIGHT_RATIO = 0.5
const SOFA_BACK_DEPTH_RATIO = 0.18
const SOFA_ARM_WIDTH_RATIO = 0.14
const SOFA_ARM_HEIGHT_RATIO = 0.8

// a sofa built from 4 boxes (seat, backrest, 2 armrests) instead of one slab — the same
// base + backrest + arms breakdown a real sofa build uses, just boxes instead of bricks
function SofaMesh({ width, height, depth, color }) {
  const armW = width * SOFA_ARM_WIDTH_RATIO
  const backD = depth * SOFA_BACK_DEPTH_RATIO
  const seatH = height * SOFA_SEAT_HEIGHT_RATIO
  const armH = height * SOFA_ARM_HEIGHT_RATIO
  const seatW = width - armW * 2
  const seatD = depth - backD

  return (
    <group>
      <mesh position={[0, seatH / 2, backD / 2]}>
        <boxGeometry args={[seatW, seatH, seatD]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, height / 2, -depth / 2 + backD / 2]}>
        <boxGeometry args={[width, height, backD]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[-width / 2 + armW / 2, armH / 2, 0]}>
        <boxGeometry args={[armW, armH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[width / 2 - armW / 2, armH / 2, 0]}>
        <boxGeometry args={[armW, armH, depth]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  )
}

// shared, stateless horizontal plane at y=0 — every room's floor sits here, used to turn a
// pointer ray into a world-space point while dragging furniture
const FLOOR_PLANE = new Plane(new Vector3(0, 1, 0), 0)

// a furniture item you can pick up and move in the 3D view: click (or tap) it, drag to
// reposition, release to drop. A fresh click/tap is needed to start moving it again afterward —
// there's no "carry" mode, this is a plain press-drag-release like the 2D editor's furniture.
function FurnitureItem({ item, room, isSelected, highlightColor, onRoomSelect, onDragChange }) {
  const selectFurniture = useHouseStore((s) => s.selectFurniture)
  const updateFurniture = useHouseStore((s) => s.updateFurniture)
  const groupRef = useRef(null)
  const dragRef = useRef(null)

  const isSofa = item.type === 'sofa' || item.type === 'lego-sofa'
  const baseX = item.x + item.width / 2 - room.width / 2
  const baseZ = item.y + item.depth / 2 - room.height / 2

  // this room's own position + rotation, so a world-space drag point can be converted into the
  // room's local (unrotated) frame that item.x/item.y are stored in — see the outer group below
  const posX = room.x + room.width / 2
  const posZ = room.y + room.height / 2
  const rotationRad = ((room.rotation ?? 0) * Math.PI) / 180
  const cos = Math.cos(rotationRad)
  const sin = Math.sin(rotationRad)

  function pointerToRoomLocal(e) {
    const point = new Vector3()
    e.ray.intersectPlane(FLOOR_PLANE, point)
    const dx = point.x - posX
    const dz = point.z - posZ
    return { x: dx * cos + dz * sin, z: -dx * sin + dz * cos }
  }

  const handlePointerDown = (e) => {
    e.stopPropagation()
    onRoomSelect(room.id)
    selectFurniture(item.id)
    e.target.setPointerCapture(e.pointerId)
    const local = pointerToRoomLocal(e)
    dragRef.current = { grabX: local.x, grabZ: local.z, startX: item.x, startY: item.y, currentX: item.x, currentY: item.y }
    onDragChange(true)
  }

  const handlePointerMove = (e) => {
    if (!dragRef.current) return
    e.stopPropagation()
    const local = pointerToRoomLocal(e)
    const rawX = dragRef.current.startX + (local.x - dragRef.current.grabX)
    const rawY = dragRef.current.startY + (local.z - dragRef.current.grabZ)
    const x = Math.min(Math.max(0, rawX), Math.max(0, room.width - item.width))
    const y = Math.min(Math.max(0, rawY), Math.max(0, room.height - item.depth))
    if (groupRef.current) {
      groupRef.current.position.x = x + item.width / 2 - room.width / 2
      groupRef.current.position.z = y + item.depth / 2 - room.height / 2
    }
    dragRef.current.currentX = x
    dragRef.current.currentY = y
  }

  const endDrag = (e) => {
    if (!dragRef.current) return
    e.stopPropagation()
    const { currentX, currentY } = dragRef.current
    updateFurniture(room.id, item.id, {
      x: Math.round(currentX * 10) / 10,
      y: Math.round(currentY * 10) / 10,
    })
    dragRef.current = null
    onDragChange(false)
  }

  return (
    <group
      ref={groupRef}
      position={[baseX, 0, baseZ]}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {isSofa ? (
        <SofaMesh width={item.width} height={item.height} depth={item.depth} color={item.color} />
      ) : (
        <mesh position={[0, item.height / 2, 0]}>
          <boxGeometry args={[item.width, item.height, item.depth]} />
          <meshStandardMaterial color={item.color} />
        </mesh>
      )}
      {isSelected && (
        <mesh position={[0, item.height / 2, 0]} raycast={() => null}>
          <boxGeometry args={[item.width, item.height, item.depth]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          <Edges color={highlightColor} lineWidth={2} />
        </mesh>
      )}
    </group>
  )
}

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

// flat non-rectangular mesh for floor/ceiling — any ordered polygon works (flipY handles their opposite X rotations)
function buildPolygonShape(points, width, height, flipY) {
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

// loads an uploaded image (a data URL) as a texture; manual instead of drei's useTexture since
// the Canvas here isn't wrapped in a Suspense boundary
function usePictureTexture(src) {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    if (!src) {
      setTexture(null)
      return undefined
    }
    let cancelled = false
    new TextureLoader().load(src, (tex) => {
      if (cancelled) return
      tex.colorSpace = SRGBColorSpace
      setTexture(tex)
    })
    return () => {
      cancelled = true
    }
  }, [src])

  return texture
}

const PICTURE_FRAME_MARGIN = 0.04 // meters, how far the frame border extends past the image on each side
const PICTURE_FRAME_DEPTH = 0.03
const PICTURE_FRAME_COLOR = '#4a3524'

// a framed picture hung flush against a wall's room-facing surface, at `offset` along its length
// (same 0-1 convention as doors/windows) and `bottom` meters up from the floor
function PictureFrame({ picture, length, thickness, insideSign }) {
  const texture = usePictureTexture(picture.src)
  const localX = picture.offset * length - length / 2
  const localY = picture.bottom + picture.height / 2
  const localZ = insideSign * (thickness / 2 + PICTURE_FRAME_DEPTH / 2)

  return (
    <group position={[localX, localY, localZ]} rotation={[0, insideSign > 0 ? 0 : Math.PI, 0]}>
      <mesh>
        <boxGeometry args={[picture.width + PICTURE_FRAME_MARGIN, picture.height + PICTURE_FRAME_MARGIN, PICTURE_FRAME_DEPTH]} />
        <meshStandardMaterial color={PICTURE_FRAME_COLOR} />
      </mesh>
      {texture && (
        <mesh position={[0, 0, PICTURE_FRAME_DEPTH / 2 + 0.001]}>
          <planeGeometry args={[picture.width, picture.height]} />
          <meshStandardMaterial map={texture} />
        </mesh>
      )}
    </group>
  )
}

function WallWithOpenings({ length, position, rotation, thickness = WALL_THICKNESS, trimStart = 0, trimEnd = 0, color, glassColor, roomId, wallKind, wallKey, onClick, onSelectWall, onWallDoubleClick, pickMode, onWallColorPick, doors, windows, pictures }) {
  const openings = useMemo(() => computeOpenings(length, doors, windows), [length, doors, windows])
  const segments = useMemo(
    () => clipSegments(buildSolidSegments(length, openings), trimStart, trimEnd, length),
    [length, openings, trimStart, trimEnd]
  )
  const windowOpenings = openings.filter((o) => o.type === 'window')
  const insideSign = useMemo(() => wallInwardSign(position, rotation[1]), [position, rotation])
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

      {pictures.map((pic) => (
        <PictureFrame key={pic.id} picture={pic} length={length} thickness={thickness} insideSign={insideSign} />
      ))}
    </group>
  )
}

export default function Room3D({ room, isSelected, onClick, onSelectWall, onWallDoubleClick, pickMode, onWallColorPick, onFurnitureDragChange }) {
  const darkMode = useHouseStore((s) => s.darkMode)
  const selectedFurnitureId = useHouseStore((s) => s.selectedFurnitureId)
  const palette = getColors(darkMode)
  const { width, height, x, y, wallColor, floorColor } = room
  const isL = room.shape === 'L'
  const isQuad = room.shape === 'quad'
  const notchWidth = isL ? room.notchWidth : 0
  const notchHeight = isL ? room.notchHeight : 0
  const corners = isQuad ? quadCornersOf(room) : null
  const walls = room.walls ?? DEFAULT_WALLS
  const doors = room.doors ?? []
  const windows = room.windows ?? []
  const pictures = room.pictures ?? []
  const anyWalls = Object.values(walls).some(Boolean)

  const posX = x + width / 2
  const posZ = y + height / 2

  const polygonPoints = isL
    ? getLPolygon(width, height, notchWidth, notchHeight)
    : isQuad
      ? getQuadPolygon(corners)
      : null

  const floorShape = useMemo(
    () => (polygonPoints ? buildPolygonShape(polygonPoints, width, height, true) : null),
    [polygonPoints, width, height]
  )
  const ceilingShape = useMemo(
    () => (polygonPoints ? buildPolygonShape(polygonPoints, width, height, false) : null),
    [polygonPoints, width, height]
  )

  const wallDefs = isL
    ? getLWallDefs(width, height, notchWidth, notchHeight)
    : isQuad
      ? getQuadWallDefs(corners, width, height)
      : getRectWallDefs(width, height)

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
        {polygonPoints ? <shapeGeometry args={[floorShape]} /> : <planeGeometry args={[width, height]} />}
        <meshStandardMaterial color={floorColor} />
      </mesh>

      {anyWalls && (
        <mesh position={[0, WALL_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {polygonPoints ? <shapeGeometry args={[ceilingShape]} /> : <planeGeometry args={[width, height]} />}
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
            pictures={pictures.filter((p) => p.wall === w.key)}
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
            pictures={wall.pictures ?? []}
          />
        )
      })}

      {(room.furniture ?? []).map((item) => (
        <FurnitureItem
          key={item.id}
          item={item}
          room={room}
          isSelected={item.id === selectedFurnitureId}
          highlightColor={palette.brand}
          onRoomSelect={onClick}
          onDragChange={onFurnitureDragChange}
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
