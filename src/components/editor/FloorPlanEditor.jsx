import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva'
import useHouseStore from '../../store/useHouseStore'
import { getColors, font, radius } from '../../theme'
import { SCALE, PADDING } from '../../constants/floorPlan'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_STEP = 1.15
const MIN_ROOM_SIZE = 1 // meters — smallest a room can be shrunk to via edge resize
const HANDLE_SIZE = 9 // px, screen size of an edge resize handle
const EDGE_CURSORS = { top: 'ns-resize', bottom: 'ns-resize', left: 'ew-resize', right: 'ew-resize' }
const MIN_INTERIOR_WALL_LENGTH = 0.2 // meters — smallest an interior wall can be dragged down to
const SNAP_POINT_THRESHOLD = 0.35 // meters — endpoint snap distance to room corners/other walls' endpoints
const SNAP_ANGLE_THRESHOLD_DEG = 6 // degrees — endpoint snap distance to 45° angle increments
const INTERIOR_HANDLE_RADIUS = 7 // px — endpoint handle for rotating/stretching an interior wall

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }
const WALL_KEYS = ['top', 'bottom', 'left', 'right']
const SNAP_THRESHOLD = 0.6 // meters — how close an edge has to get before it snaps flush


function getSnappedPosition(room, otherRooms, x, y) {
  const w = room.width
  const h = room.height
  let snappedX = x
  let snappedY = y
  let xSnapped = false
  let ySnapped = false
  let bestXDist = SNAP_THRESHOLD
  let bestYDist = SNAP_THRESHOLD

  otherRooms.forEach((other) => {
    const verticalOverlap = y < other.y + other.height && y + h > other.y
    const horizontalOverlap = x < other.x + other.width && x + w > other.x

    if (verticalOverlap) {
      const distRightToLeft = Math.abs(x + w - other.x)
      if (distRightToLeft < bestXDist) {
        bestXDist = distRightToLeft
        snappedX = other.x - w
        xSnapped = true
      }
      const distLeftToRight = Math.abs(x - (other.x + other.width))
      if (distLeftToRight < bestXDist) {
        bestXDist = distLeftToRight
        snappedX = other.x + other.width
        xSnapped = true
      }
    }

    if (horizontalOverlap) {
      const distBottomToTop = Math.abs(y + h - other.y)
      if (distBottomToTop < bestYDist) {
        bestYDist = distBottomToTop
        snappedY = other.y - h
        ySnapped = true
      }
      const distTopToBottom = Math.abs(y - (other.y + other.height))
      if (distTopToBottom < bestYDist) {
        bestYDist = distTopToBottom
        snappedY = other.y + other.height
        ySnapped = true
      }
    }
  })

  // corner-to-corner snapping: when a corner of the dragged room lands close to a corner of
  // another room (no shared overlapping edge required, e.g. two rooms diagonal from each other),
  // pull the dragged room so the two corners coincide exactly, keeping the shared walls straight.
  const draggedCorners = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ]
  let bestCornerDist = SNAP_THRESHOLD
  let cornerDelta = null

  otherRooms.forEach((other) => {
    const otherCorners = [
      { x: other.x, y: other.y },
      { x: other.x + other.width, y: other.y },
      { x: other.x, y: other.y + other.height },
      { x: other.x + other.width, y: other.y + other.height },
    ]
    draggedCorners.forEach((dc) => {
      otherCorners.forEach((oc) => {
        const dist = Math.hypot(dc.x - oc.x, dc.y - oc.y)
        if (dist < bestCornerDist) {
          bestCornerDist = dist
          cornerDelta = { dx: oc.x - dc.x, dy: oc.y - dc.y }
        }
      })
    })
  })

  if (cornerDelta) {
    snappedX = x + cornerDelta.dx
    snappedY = y + cornerDelta.dy
    xSnapped = true
    ySnapped = true
  }

  return { x: snappedX, y: snappedY, xSnapped, ySnapped }
}

// cuts door gaps out of a wall of pixel length lengthPx, returns the remaining [start, end] solid stretches
function solidWallStretches(lengthPx, doors) {
  const gaps = doors
    .map((d) => {
      const w = Math.min(d.width * SCALE, lengthPx)
      const start = Math.max(0, d.offset * lengthPx - w / 2)
      return [start, Math.min(lengthPx, start + w)]
    })
    .sort((a, b) => a[0] - b[0])

  const solids = []
  let cursor = 0
  gaps.forEach(([s, e]) => {
    if (s - cursor > 0.5) solids.push([cursor, s])
    cursor = Math.max(cursor, e)
  })
  if (lengthPx - cursor > 0.5) solids.push([cursor, lengthPx])
  return solids
}

function RoomWalls({ room, pixelW, pixelH, isSelected, color }) {
  const walls = room.walls ?? DEFAULT_WALLS
  const doors = room.doors ?? []
  const windows = room.windows ?? []

  return WALL_KEYS.filter((key) => walls[key]).map((key) => {
    const isHorizontal = key === 'top' || key === 'bottom'
    const lengthPx = isHorizontal ? pixelW : pixelH
    const fixedCoord = key === 'top' ? 0 : key === 'bottom' ? pixelH : key === 'left' ? 0 : pixelW
    const inward = key === 'top' ? 1 : key === 'bottom' ? -1 : key === 'left' ? 1 : -1

    const wallDoors = doors.filter((d) => d.wall === key)
    const wallWindows = windows.filter((w) => w.wall === key)
    const solids = solidWallStretches(lengthPx, wallDoors)

    const toPoints = (a, b) => (isHorizontal ? [a, fixedCoord, b, fixedCoord] : [fixedCoord, a, fixedCoord, b])

    return (
      <Group key={key}>
        {solids.map(([s, e], i) => (
          <Line
            key={`wall-${i}`}
            points={toPoints(s, e)}
            stroke={isSelected ? color.brand : color.text}
            strokeWidth={isSelected ? 3.5 : 2.5}
            lineCap="square"
          />
        ))}

        {wallWindows.map((win) => {
          const w = Math.min(win.width * SCALE, lengthPx)
          const start = Math.max(0, win.offset * lengthPx - w / 2)
          const end = Math.min(lengthPx, start + w)
          return (
            <Line
              key={win.id}
              points={toPoints(start, end)}
              stroke={color.window}
              strokeWidth={5}
              lineCap="square"
            />
          )
        })}

        {wallDoors.map((d) => {
          const w = Math.min(d.width * SCALE, lengthPx)
          const start = Math.max(0, d.offset * lengthPx - w / 2)
          const mid = start + w / 2
          const leafPoints = isHorizontal
            ? [mid, fixedCoord, mid, fixedCoord + inward * w * 0.7]
            : [fixedCoord, mid, fixedCoord + inward * w * 0.7, mid]
          return (
            <Line
              key={d.id}
              points={leafPoints}
              stroke={color.muted}
              strokeWidth={1.5}
              dash={[3, 3]}
            />
          )
        })}
      </Group>
    )
  })
}

// interior partition walls: freeform two-endpoint walls, not tied to a room's 4 boundary edges
function InteriorWalls({ room, selectedWallId, color, onSelectWall, onBodyMove, onBodyEnd, onEndpointMove, onEndpointEnd }) {
  const wallsList = room.interiorWalls ?? []

  return wallsList.map((wall) => {
    const x1px = wall.x1 * SCALE
    const y1px = wall.y1 * SCALE
    const x2px = wall.x2 * SCALE
    const y2px = wall.y2 * SCALE
    const dx = x2px - x1px
    const dy = y2px - y1px
    const lengthPx = Math.hypot(dx, dy)
    if (lengthPx < 1) return null

    const ux = dx / lengthPx
    const uy = dy / lengthPx
    const nx = -uy
    const ny = ux
    const toPoint = (t) => [x1px + ux * t, y1px + uy * t]

    const doors = wall.doors ?? []
    const windows = wall.windows ?? []
    const solids = solidWallStretches(lengthPx, doors)
    const strokeW = Math.max(wall.thickness * SCALE, 3)
    const wallSelected = wall.id === selectedWallId

    // lives on a Shape (the rail below), not the wrapping Group, so the click reliably fires
    const handleSelect = (e) => {
      e.cancelBubble = true
      onSelectWall(wall.id)
    }

    return (
      <Group key={wall.id}>
        {solids.map(([s, e], i) => {
          const [sx, sy] = toPoint(s)
          const [ex, ey] = toPoint(e)
          return (
            <Line
              key={`solid-${i}`}
              points={[sx, sy, ex, ey]}
              stroke={wallSelected ? color.brand : color.text}
              strokeWidth={strokeW}
              lineCap="square"
              listening={false}
            />
          )
        })}

        {windows.map((win) => {
          const w = Math.min(win.width * SCALE, lengthPx)
          const start = Math.max(0, win.offset * lengthPx - w / 2)
          const end = Math.min(lengthPx, start + w)
          const [sx, sy] = toPoint(start)
          const [ex, ey] = toPoint(end)
          return (
            <Line
              key={win.id}
              points={[sx, sy, ex, ey]}
              stroke={color.window}
              strokeWidth={5}
              lineCap="square"
              listening={false}
            />
          )
        })}

        {doors.map((d) => {
          const w = Math.min(d.width * SCALE, lengthPx)
          const start = Math.max(0, d.offset * lengthPx - w / 2)
          const mid = start + w / 2
          const [cx, cy] = toPoint(mid)
          return (
            <Line
              key={d.id}
              points={[cx, cy, cx + nx * w * 0.7, cy + ny * w * 0.7]}
              stroke={color.muted}
              strokeWidth={1.5}
              dash={[3, 3]}
              listening={false}
            />
          )
        })}

        {/* click target + drag rail for translating the whole wall */}
        <Line
          points={[x1px, y1px, x2px, y2px]}
          stroke={color.brand}
          opacity={wallSelected ? 0.18 : 0.001}
          strokeWidth={Math.max(strokeW * 1.8, 14)}
          lineCap="round"
          hitStrokeWidth={Math.max(strokeW * 1.8, 14)}
          draggable={wallSelected}
          onClick={handleSelect}
          onDragMove={(e) => onBodyMove(e, room.id, wall.id)}
          onDragEnd={(e) => onBodyEnd(e, room.id, wall.id)}
          onMouseEnter={(e) => {
            e.target.getStage().container().style.cursor = wallSelected ? 'move' : 'pointer'
          }}
          onMouseLeave={(e) => {
            e.target.getStage().container().style.cursor = 'default'
          }}
        />

        {wallSelected &&
          [
            ['a', x1px, y1px],
            ['b', x2px, y2px],
          ].map(([endpoint, ex, ey]) => (
            <Circle
              key={endpoint}
              x={ex}
              y={ey}
              radius={INTERIOR_HANDLE_RADIUS}
              fill={color.brand}
              stroke={color.bg}
              strokeWidth={2}
              draggable
              hitStrokeWidth={20}
              onDragMove={(e) => onEndpointMove(e, room.id, wall.id, endpoint)}
              onDragEnd={(e) => onEndpointEnd(e, room.id, wall.id, endpoint)}
              onMouseEnter={(e) => {
                e.target.getStage().container().style.cursor = 'crosshair'
              }}
              onMouseLeave={(e) => {
                e.target.getStage().container().style.cursor = 'default'
              }}
            />
          ))}
      </Group>
    )
  })
}

function ResizeHandle({ room, edge, pixelX, pixelY, pixelW, pixelH, color, onResizeMove, onResizeEnd }) {
  const positions = {
    top: [pixelX + pixelW / 2, pixelY],
    bottom: [pixelX + pixelW / 2, pixelY + pixelH],
    left: [pixelX, pixelY + pixelH / 2],
    right: [pixelX + pixelW, pixelY + pixelH / 2],
  }
  const [hx, hy] = positions[edge]

  return (
    <Rect
      x={hx - HANDLE_SIZE / 2}
      y={hy - HANDLE_SIZE / 2}
      width={HANDLE_SIZE}
      height={HANDLE_SIZE}
      fill={color.bg}
      stroke={color.brand}
      strokeWidth={1.5}
      cornerRadius={2}
      draggable
      hitStrokeWidth={16}
      onDragMove={(e) => onResizeMove(e, room.id, edge)}
      onDragEnd={(e) => onResizeEnd(e, room.id, edge)}
      onMouseEnter={(e) => {
        e.target.getStage().container().style.cursor = EDGE_CURSORS[edge]
      }}
      onMouseLeave={(e) => {
        e.target.getStage().container().style.cursor = 'default'
      }}
    />
  )
}

function ZoomButton({ children, onClick, title, color }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 30,
        height: 30,
        borderRadius: radius.sm,
        border: `1px solid ${color.border}`,
        background: color.bg,
        color: color.text,
        cursor: 'pointer',
        fontSize: 15,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

export default function FloorPlanEditor() {
  const {
    rooms,
    selectedRoomId,
    selectRoom,
    updateRoom,
    selectedInteriorWallId,
    selectInteriorWall,
    updateInteriorWall,
    darkMode,
    setViewCenter,
  } = useHouseStore()
  const color = getColors(darkMode)
  const containerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

  // keeps the store aware of what room-space point is currently centered on screen, so a newly
  // added room can be placed right where the user is looking instead of always at a fixed spot
  useEffect(() => {
    const worldCenterX = (stageSize.width / 2 - stagePos.x) / stageScale
    const worldCenterY = (stageSize.height / 2 - stagePos.y) / stageScale
    setViewCenter((worldCenterX - PADDING) / SCALE, (worldCenterY - PADDING) / SCALE)
  }, [stageSize, stageScale, stagePos, setViewCenter])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => setStageSize({ width: el.clientWidth, height: el.clientHeight })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleDragMove(e, roomId) {
    // ignore drags bubbling up from a nested interior wall, only handle the room Group's own drag
    if (e.target !== e.currentTarget) return
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return
    const rawX = (e.target.x() - PADDING) / SCALE
    const rawY = (e.target.y() - PADDING) / SCALE
    const others = rooms.filter((r) => r.id !== roomId)
    const snapped = getSnappedPosition(room, others, rawX, rawY)
    e.target.x(snapped.x * SCALE + PADDING)
    e.target.y(snapped.y * SCALE + PADDING)
  }

  function handleDragEnd(e, roomId) {
    if (e.target !== e.currentTarget) return
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return
    const rawX = (e.target.x() - PADDING) / SCALE
    const rawY = (e.target.y() - PADDING) / SCALE
    const others = rooms.filter((r) => r.id !== roomId)
    const snapped = getSnappedPosition(room, others, rawX, rawY)
    const newX = snapped.xSnapped ? snapped.x : Math.round(snapped.x)
    const newY = snapped.ySnapped ? snapped.y : Math.round(snapped.y)
    updateRoom(roomId, { x: newX, y: newY })
  }

  
  function resizeRoomForEdge(e, roomId, edge) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null

    const pointerX = (e.target.x() + HANDLE_SIZE / 2 - PADDING) / SCALE
    const pointerY = (e.target.y() + HANDLE_SIZE / 2 - PADDING) / SCALE

    let { x, y, width, height } = room

    if (edge === 'top') {
      const newY = Math.min(pointerY, room.y + room.height - MIN_ROOM_SIZE)
      height = room.y + room.height - newY
      y = newY
    } else if (edge === 'bottom') {
      height = Math.max(MIN_ROOM_SIZE, pointerY - room.y)
    } else if (edge === 'left') {
      const newX = Math.min(pointerX, room.x + room.width - MIN_ROOM_SIZE)
      width = room.x + room.width - newX
      x = newX
    } else if (edge === 'right') {
      width = Math.max(MIN_ROOM_SIZE, pointerX - room.x)
    }

    const pixelX = x * SCALE + PADDING
    const pixelY = y * SCALE + PADDING
    const pixelW = width * SCALE
    const pixelH = height * SCALE
    const positions = {
      top: [pixelX + pixelW / 2, pixelY],
      bottom: [pixelX + pixelW / 2, pixelY + pixelH],
      left: [pixelX, pixelY + pixelH / 2],
      right: [pixelX + pixelW, pixelY + pixelH / 2],
    }
    const [hx, hy] = positions[edge]
    e.target.x(hx - HANDLE_SIZE / 2)
    e.target.y(hy - HANDLE_SIZE / 2)

    return { x, y, width, height }
  }

  function handleResizeMove(e, roomId, edge) {
    const rect = resizeRoomForEdge(e, roomId, edge)
    if (rect) updateRoom(roomId, rect)
  }

  function handleResizeEnd(e, roomId, edge) {
    const rect = resizeRoomForEdge(e, roomId, edge)
    if (!rect) return
    updateRoom(roomId, {
      x: Math.round(rect.x * 10) / 10,
      y: Math.round(rect.y * 10) / 10,
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
    })
  }

  function findInteriorWall(roomId, wallId) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null
    const wall = (room.interiorWalls ?? []).find((w) => w.id === wallId)
    if (!wall) return null
    return { room, wall }
  }

  // translates both endpoints of an interior wall by the drag node's pixel offset, clamped to the room's bounds
  function moveInteriorWallBody(e, roomId, wallId) {
    const found = findInteriorWall(roomId, wallId)
    if (!found) return null
    const { room, wall } = found

    const dxM = e.target.x() / SCALE
    const dyM = e.target.y() / SCALE
    const minDx = -Math.min(wall.x1, wall.x2)
    const maxDx = room.width - Math.max(wall.x1, wall.x2)
    const minDy = -Math.min(wall.y1, wall.y2)
    const maxDy = room.height - Math.max(wall.y1, wall.y2)
    const clampedDx = Math.min(maxDx, Math.max(minDx, dxM))
    const clampedDy = Math.min(maxDy, Math.max(minDy, dyM))

    e.target.x(0)
    e.target.y(0)

    return {
      x1: wall.x1 + clampedDx,
      y1: wall.y1 + clampedDy,
      x2: wall.x2 + clampedDx,
      y2: wall.y2 + clampedDy,
    }
  }

  function handleInteriorWallBodyMove(e, roomId, wallId) {
    const rect = moveInteriorWallBody(e, roomId, wallId)
    if (rect) updateInteriorWall(roomId, wallId, rect)
  }

  function handleInteriorWallBodyEnd(e, roomId, wallId) {
    const rect = moveInteriorWallBody(e, roomId, wallId)
    if (!rect) return
    updateInteriorWall(roomId, wallId, {
      x1: Math.round(rect.x1 * 10) / 10,
      y1: Math.round(rect.y1 * 10) / 10,
      x2: Math.round(rect.x2 * 10) / 10,
      y2: Math.round(rect.y2 * 10) / 10,
    })
  }

  // snaps a dragged endpoint to room corners / other walls' endpoints first, else to the nearest 45°
  function snapInteriorWallEndpoint(room, wall, otherX, otherY, rawX, rawY) {
    const candidates = [
      { x: 0, y: 0 },
      { x: room.width, y: 0 },
      { x: 0, y: room.height },
      { x: room.width, y: room.height },
    ]
    ;(room.interiorWalls ?? []).forEach((w) => {
      if (w.id === wall.id) return
      candidates.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 })
    })

    let bestPoint = null
    let bestDist = SNAP_POINT_THRESHOLD
    candidates.forEach((p) => {
      const d = Math.hypot(rawX - p.x, rawY - p.y)
      if (d < bestDist) {
        bestDist = d
        bestPoint = p
      }
    })
    if (bestPoint) return bestPoint

    const dist = Math.hypot(rawX - otherX, rawY - otherY)
    if (dist < 0.001) return { x: rawX, y: rawY }
    const angle = Math.atan2(rawY - otherY, rawX - otherX)
    const step = Math.PI / 4
    const nearestAngle = Math.round(angle / step) * step
    const diffDeg = Math.abs(Math.atan2(Math.sin(angle - nearestAngle), Math.cos(angle - nearestAngle))) * (180 / Math.PI)
    if (diffDeg <= SNAP_ANGLE_THRESHOLD_DEG) {
      return { x: otherX + Math.cos(nearestAngle) * dist, y: otherY + Math.sin(nearestAngle) * dist }
    }
    return { x: rawX, y: rawY }
  }

  function moveInteriorWallEndpoint(e, roomId, wallId, endpoint) {
    const found = findInteriorWall(roomId, wallId)
    if (!found) return null
    const { room, wall } = found
    const otherX = endpoint === 'a' ? wall.x2 : wall.x1
    const otherY = endpoint === 'a' ? wall.y2 : wall.y1

    const rawX = Math.min(room.width, Math.max(0, e.target.x() / SCALE))
    const rawY = Math.min(room.height, Math.max(0, e.target.y() / SCALE))
    const snapped = snapInteriorWallEndpoint(room, wall, otherX, otherY, rawX, rawY)

    let x = Math.min(room.width, Math.max(0, snapped.x))
    let y = Math.min(room.height, Math.max(0, snapped.y))

    if (Math.hypot(x - otherX, y - otherY) < MIN_INTERIOR_WALL_LENGTH) {
      const angle = Math.atan2(y - otherY, x - otherX)
      x = otherX + Math.cos(angle) * MIN_INTERIOR_WALL_LENGTH
      y = otherY + Math.sin(angle) * MIN_INTERIOR_WALL_LENGTH
    }

    e.target.x(x * SCALE)
    e.target.y(y * SCALE)

    return endpoint === 'a' ? { x1: x, y1: y } : { x2: x, y2: y }
  }

  function handleInteriorWallEndpointMove(e, roomId, wallId, endpoint) {
    const updates = moveInteriorWallEndpoint(e, roomId, wallId, endpoint)
    if (updates) updateInteriorWall(roomId, wallId, updates)
  }

  function handleInteriorWallEndpointEnd(e, roomId, wallId, endpoint) {
    const updates = moveInteriorWallEndpoint(e, roomId, wallId, endpoint)
    if (!updates) return
    const rounded = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, Math.round(value * 10) / 10])
    )
    updateInteriorWall(roomId, wallId, rounded)
  }

  function zoomAtCenter(nextScale) {
    const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextScale))
    const center = { x: stageSize.width / 2, y: stageSize.height / 2 }
    const focus = {
      x: (center.x - stagePos.x) / stageScale,
      y: (center.y - stagePos.y) / stageScale,
    }
    setStageScale(clamped)
    setStagePos({
      x: center.x - focus.x * clamped,
      y: center.y - focus.y * clamped,
    })
  }

  function handleWheel(e) {
    e.evt.preventDefault()
    const stage = e.target.getStage()
    const pointer = stage.getPointerPosition()
    const oldScale = stageScale

    const focus = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1
    const rawScale = direction > 0 ? oldScale * ZOOM_STEP : oldScale / ZOOM_STEP
    const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, rawScale))

    setStageScale(newScale)
    setStagePos({
      x: pointer.x - focus.x * newScale,
      y: pointer.y - focus.y * newScale,
    })
  }

  function resetView() {
    setStageScale(1)
    setStagePos({ x: 0, y: 0 })
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: color.workspace,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Stage
        width={stageSize.width}
        height={stageSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable
        onDragEnd={(e) => {
          // ignore drags bubbling up from a room/wall, only handle the Stage's own pan drag
          if (e.target !== e.currentTarget) return
          setStagePos({ x: e.target.x(), y: e.target.y() })
        }}
        onWheel={handleWheel}
      >
        <Layer>
          {rooms.map((room) => {
            const isSelected = room.id === selectedRoomId
            const pixelX = room.x * SCALE + PADDING
            const pixelY = room.y * SCALE + PADDING
            const pixelW = room.width * SCALE
            const pixelH = room.height * SCALE
            const hasAnyWall = Object.values(room.walls ?? DEFAULT_WALLS).some(Boolean)

            return (
              <Group
                key={room.id}
                x={pixelX}
                y={pixelY}
                draggable
                onDragMove={(e) => handleDragMove(e, room.id)}
                onDragEnd={(e) => handleDragEnd(e, room.id)}
                onClick={() => selectRoom(room.id)}
              >
                <Rect
                  width={pixelW}
                  height={pixelH}
                  fill={room.floorColor}
                  stroke={isSelected && !hasAnyWall ? color.brand : 'transparent'}
                  strokeWidth={1.5}
                  dash={hasAnyWall ? undefined : [5, 4]}
                />

                <RoomWalls room={room} pixelW={pixelW} pixelH={pixelH} isSelected={isSelected} color={color} />

                <InteriorWalls
                  room={room}
                  selectedWallId={selectedInteriorWallId}
                  color={color}
                  onSelectWall={selectInteriorWall}
                  onBodyMove={handleInteriorWallBodyMove}
                  onBodyEnd={handleInteriorWallBodyEnd}
                  onEndpointMove={handleInteriorWallEndpointMove}
                  onEndpointEnd={handleInteriorWallEndpointEnd}
                />

                <Text
                  text={room.name}
                  width={pixelW}
                  height={pixelH}
                  align="center"
                  verticalAlign="middle"
                  fontSize={12}
                  fontStyle={isSelected ? 'bold' : 'normal'}
                  fill={isSelected ? color.brand : color.text}
                  fontFamily={font}
                  listening={false}
                />

                <Text
                  text={`${room.width}m × ${room.height}m`}
                  width={pixelW}
                  y={pixelH - 20}
                  align="center"
                  fontSize={10}
                  fill={color.muted}
                  fontFamily={font}
                  listening={false}
                />
              </Group>
            )
          })}

          {rooms
            .filter((room) => room.id === selectedRoomId)
            .map((room) => {
              const pixelX = room.x * SCALE + PADDING
              const pixelY = room.y * SCALE + PADDING
              const pixelW = room.width * SCALE
              const pixelH = room.height * SCALE
              return WALL_KEYS.map((edge) => (
                <ResizeHandle
                  key={`${room.id}-${edge}`}
                  room={room}
                  edge={edge}
                  pixelX={pixelX}
                  pixelY={pixelY}
                  pixelW={pixelW}
                  pixelH={pixelH}
                  color={color}
                  onResizeMove={handleResizeMove}
                  onResizeEnd={handleResizeEnd}
                />
              ))
            })}
        </Layer>
      </Stage>

      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: color.bg,
          padding: 6,
          borderRadius: radius.md,
          border: `1px solid ${color.border}`,
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        }}
      >
        <ZoomButton title="Zoom in" onClick={() => zoomAtCenter(stageScale * ZOOM_STEP)} color={color}>
          +
        </ZoomButton>
        <ZoomButton title="Zoom out" onClick={() => zoomAtCenter(stageScale / ZOOM_STEP)} color={color}>
          −
        </ZoomButton>
        <div
          style={{
            textAlign: 'center',
            fontSize: 10,
            color: color.muted,
            padding: '2px 0',
          }}
        >
          {Math.round(stageScale * 100)}%
        </div>
        <ZoomButton title="Reset view" onClick={resetView} color={color}>
          ⤢
        </ZoomButton>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12,
          color: color.muted,
        }}
      >
        Scroll to zoom · Drag empty space to pan · Drag a room to reposition or its edge handles to resize it · Click an interior wall to select just that wall, then drag it to move it or its round end handles to rotate/stretch it
      </div>
    </div>
  )
}
