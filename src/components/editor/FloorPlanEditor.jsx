import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva'
import { useShallow } from 'zustand/react/shallow'
import useHouseStore from '../../store/useHouseStore'
import { getColors, font, radius } from '../../theme'
import { SCALE, PADDING, MIN_ROOM_SIZE } from '../../constants/floorPlan'
import { getLEdges, getLPolygon, MIN_NOTCH, L_WALL_KEYS, DEFAULT_L_WALLS } from '../../constants/lshape'
import { rotateAround, getRoomAABB, getSnappedPosition } from '../../utils/roomGeometry'
import {
  SNAP_ANGLE_THRESHOLD_DEG,
  computeWallBodyTranslate,
  computeWallEndpointMove,
  roomsInMarquee,
} from '../../utils/interiorWallGeometry'
import { formatLength } from '../../utils/units'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_STEP = 1.15
const HANDLE_SIZE = 9 // px, screen size of an edge resize handle
const EDGE_CURSORS = { top: 'ns-resize', bottom: 'ns-resize', left: 'ew-resize', right: 'ew-resize' }
const L_EDGE_CURSORS = { top: 'ns-resize', bottom: 'ns-resize', notchH: 'ns-resize', left: 'ew-resize', right: 'ew-resize', notchV: 'ew-resize' }
const INTERIOR_HANDLE_RADIUS = 7 // px — endpoint handle for rotating/stretching an interior wall
const ROTATE_SNAP_DEG = 45 // degrees — increment a room's rotation handle "clicks" into
const ROTATE_HANDLE_DIST = 24 // px above the room's (unrotated) top edge where its rotation handle sits
const ROTATE_HANDLE_RADIUS = 6 // px

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }
const WALL_KEYS = ['top', 'bottom', 'left', 'right']

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

// same rendering as RoomWalls, generalized to an L-shaped room's 6 edges — walks each edge's own
// direction/normal instead of the fixed top/bottom/left/right cases (see constants/lshape)
function LRoomWalls({ room, pixelW, pixelH, pixelNW, pixelNH, isSelected, color }) {
  const walls = room.walls ?? DEFAULT_L_WALLS
  const doors = room.doors ?? []
  const windows = room.windows ?? []
  const edges = getLEdges(pixelW, pixelH, pixelNW, pixelNH)

  return edges.filter((edge) => walls[edge.key]).map((edge) => {
    const dx = edge.to.x - edge.from.x
    const dy = edge.to.y - edge.from.y
    const lengthPx = Math.hypot(dx, dy)
    const ux = dx / lengthPx
    const uy = dy / lengthPx
    const nx = -uy
    const ny = ux
    const toPoint = (t) => [edge.from.x + ux * t, edge.from.y + uy * t]

    const wallDoors = doors.filter((d) => d.wall === edge.key)
    const wallWindows = windows.filter((w) => w.wall === edge.key)
    const solids = solidWallStretches(lengthPx, wallDoors)

    return (
      <Group key={edge.key}>
        {solids.map(([s, e2], i) => {
          const [sx, sy] = toPoint(s)
          const [ex, ey] = toPoint(e2)
          return (
            <Line
              key={`wall-${i}`}
              points={[sx, sy, ex, ey]}
              stroke={isSelected ? color.brand : color.text}
              strokeWidth={isSelected ? 3.5 : 2.5}
              lineCap="square"
            />
          )
        })}

        {wallWindows.map((win) => {
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
            />
          )
        })}

        {wallDoors.map((d) => {
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
            />
          )
        })}
      </Group>
    )
  })
}

// interior partition walls: freeform two-endpoint walls, not tied to a room's 4 boundary edges
function InteriorWalls({ room, selectedWallId, color, onSelectWall, onBodyStart, onBodyMove, onBodyEnd, onEndpointMove, onEndpointEnd }) {
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

        {/* click target + drag rail for the whole wall — draggable even unselected, so grabbing
            it moves it immediately instead of requiring a select-then-drag two-step */}
        <Line
          points={[x1px, y1px, x2px, y2px]}
          stroke={color.brand}
          opacity={wallSelected ? 0.18 : 0.001}
          strokeWidth={Math.max(strokeW * 1.8, 14)}
          lineCap="round"
          hitStrokeWidth={Math.max(strokeW * 1.8, 14)}
          draggable
          onClick={handleSelect}
          onDragStart={() => onBodyStart(room.id, wall.id)}
          onDragMove={(e) => onBodyMove(e, room.id, wall.id)}
          onDragEnd={(e) => onBodyEnd(e, room.id, wall.id)}
          onMouseEnter={(e) => {
            e.target.getStage().container().style.cursor = 'move'
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

// x/y is the handle's target midpoint in stage-pixel space; each caller computes that midpoint
// differently (rectangle vs L-shape edges), so this stays a dumb node
function ResizeHandle({ roomId, edge, x, y, cursor, color, onResizeMove, onResizeEnd }) {
  return (
    <Rect
      x={x - HANDLE_SIZE / 2}
      y={y - HANDLE_SIZE / 2}
      width={HANDLE_SIZE}
      height={HANDLE_SIZE}
      fill={color.bg}
      stroke={color.brand}
      strokeWidth={1.5}
      cornerRadius={2}
      draggable
      hitStrokeWidth={16}
      onDragMove={(e) => onResizeMove(e, roomId, edge)}
      onDragEnd={(e) => onResizeEnd(e, roomId, edge)}
      onMouseEnter={(e) => {
        e.target.getStage().container().style.cursor = cursor
      }}
      onMouseLeave={(e) => {
        e.target.getStage().container().style.cursor = 'default'
      }}
    />
  )
}

// midpoint of one of an L-shaped room's 6 edges, offset by pixelX/pixelY — shared by the resize
// handles and the drag-resize math itself
function lEdgeMidpoint(pixelX, pixelY, pixelW, pixelH, pixelNW, pixelNH, edgeKey) {
  const edge = getLEdges(pixelW, pixelH, pixelNW, pixelNH).find((e) => e.key === edgeKey)
  return [pixelX + (edge.from.x + edge.to.x) / 2, pixelY + (edge.from.y + edge.to.y) / 2]
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

// useShallow avoids re-rendering on unrelated store changes
const selectFloorPlanState = (s) => ({
  rooms: s.rooms,
  selectedRoomId: s.selectedRoomId,
  selectRoom: s.selectRoom,
  updateRoom: s.updateRoom,
  moveRoomsTo: s.moveRoomsTo,
  selectedRoomIds: s.selectedRoomIds,
  toggleRoomSelection: s.toggleRoomSelection,
  setSelectedRoomIds: s.setSelectedRoomIds,
  selectedInteriorWallId: s.selectedInteriorWallId,
  selectInteriorWall: s.selectInteriorWall,
  updateInteriorWall: s.updateInteriorWall,
  darkMode: s.darkMode,
  unit: s.unit,
  setViewCenter: s.setViewCenter,
})

export default function FloorPlanEditor() {
  const {
    rooms,
    selectedRoomId,
    selectRoom,
    updateRoom,
    moveRoomsTo,
    selectedRoomIds,
    toggleRoomSelection,
    setSelectedRoomIds,
    selectedInteriorWallId,
    selectInteriorWall,
    updateInteriorWall,
    darkMode,
    unit,
    setViewCenter,
  } = useHouseStore(useShallow(selectFloorPlanState))
  const color = getColors(darkMode)
  const containerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })
  const [isShiftHeld, setIsShiftHeld] = useState(false)
  // rubber-band selection box, in world-pixel space (same space as room pixelX/pixelY below)
  const [marquee, setMarquee] = useState(null)
  // snapshot at group-drag start: which room started it, its pointer-space start position, and
  // every selected room's starting (x, y) in meters — see handleGroupDragMove
  const groupDragRef = useRef(null)
  // same start-snapshot pattern as groupDragRef, for translating a whole interior wall — see
  // startInteriorWallBodyDrag
  const wallBodyDragRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setIsShiftHeld(true)
      if (e.key === 'Escape') setSelectedRoomIds([])
    }
    const handleKeyUp = (e) => {
      if (e.key === 'Shift') setIsShiftHeld(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setSelectedRoomIds])

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

  // rooms off the 90° grid (see getRoomAABB) skip axis-aligned snapping entirely, both for their
  // own drag and others snapping against them. The room Group is positioned by its CENTER (Konva
  // rotates around it), so e.target.x()/y() report that center; snapping works in AABB terms
  // (width/height swapped for a 90°/270° room), then converts back to center and to the room's own x/y.
  function handleDragMove(e, roomId) {
    // ignore drags bubbling up from a nested interior wall, only handle the room Group's own drag
    if (e.target !== e.currentTarget) return
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return
    const selfAABB = getRoomAABB(room)
    if (!selfAABB) return
    const centerX = (e.target.x() - PADDING) / SCALE
    const centerY = (e.target.y() - PADDING) / SCALE
    const rawX = centerX - selfAABB.width / 2
    const rawY = centerY - selfAABB.height / 2
    const others = rooms.filter((r) => r.id !== roomId).map(getRoomAABB).filter(Boolean)
    const snapped = getSnappedPosition(selfAABB, others, rawX, rawY)
    e.target.x((snapped.x + selfAABB.width / 2) * SCALE + PADDING)
    e.target.y((snapped.y + selfAABB.height / 2) * SCALE + PADDING)
  }

  function handleDragEnd(e, roomId) {
    if (e.target !== e.currentTarget) return
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return
    const selfAABB = getRoomAABB(room)
    if (!selfAABB) {
      const rawX = (e.target.x() - PADDING) / SCALE - room.width / 2
      const rawY = (e.target.y() - PADDING) / SCALE - room.height / 2
      updateRoom(roomId, { x: Math.round(rawX * 10) / 10, y: Math.round(rawY * 10) / 10 })
      return
    }
    const centerX = (e.target.x() - PADDING) / SCALE
    const centerY = (e.target.y() - PADDING) / SCALE
    const rawX = centerX - selfAABB.width / 2
    const rawY = centerY - selfAABB.height / 2
    const others = rooms.filter((r) => r.id !== roomId).map(getRoomAABB).filter(Boolean)
    const snapped = getSnappedPosition(selfAABB, others, rawX, rawY)
    const aabbX = snapped.xSnapped ? snapped.x : Math.round(snapped.x)
    const aabbY = snapped.ySnapped ? snapped.y : Math.round(snapped.y)
    updateRoom(roomId, {
      x: aabbX + selfAABB.width / 2 - room.width / 2,
      y: aabbY + selfAABB.height / 2 - room.height / 2,
    })
  }

  // when the grabbed room is part of a multi-selection, the whole set translates together by the
  // same raw pixel delta — no snapping, since it'd only ever align the one room under the pointer.
  // A single selected room still uses handleDragMove/End's snap-to-neighbor path.
  function startGroupDrag(e, roomId) {
    if (e.target !== e.currentTarget) return
    if (selectedRoomIds.length < 2 || !selectedRoomIds.includes(roomId)) {
      groupDragRef.current = null
      return
    }
    groupDragRef.current = {
      originId: roomId,
      startX: e.target.x(),
      startY: e.target.y(),
      origins: selectedRoomIds
        .map((id) => rooms.find((r) => r.id === id))
        .filter(Boolean)
        .map((r) => ({ id: r.id, x: r.x, y: r.y })),
    }
  }

  function groupDragDelta(e) {
    const gd = groupDragRef.current
    return { dx: (e.target.x() - gd.startX) / SCALE, dy: (e.target.y() - gd.startY) / SCALE }
  }

  function handleGroupDragMove(e, roomId) {
    if (e.target !== e.currentTarget) return
    const gd = groupDragRef.current
    if (!gd || gd.originId !== roomId) {
      handleDragMove(e, roomId)
      return
    }
    const { dx, dy } = groupDragDelta(e)
    moveRoomsTo(gd.origins.map((o) => ({ id: o.id, x: o.x + dx, y: o.y + dy })))
  }

  function handleGroupDragEnd(e, roomId) {
    if (e.target !== e.currentTarget) return
    const gd = groupDragRef.current
    if (!gd || gd.originId !== roomId) {
      handleDragEnd(e, roomId)
      return
    }
    const { dx, dy } = groupDragDelta(e)
    moveRoomsTo(
      gd.origins.map((o) => ({
        id: o.id,
        x: Math.round((o.x + dx) * 10) / 10,
        y: Math.round((o.y + dy) * 10) / 10,
      }))
    )
    groupDragRef.current = null
  }

  // converts a screen pointer position to world-pixel space (same space as each room's
  // pixelX/pixelY below), undoing the stage's own pan/zoom transform
  function stagePointerToWorld(stage) {
    const pointer = stage.getPointerPosition()
    if (!pointer) return null
    return { x: (pointer.x - stagePos.x) / stageScale, y: (pointer.y - stagePos.y) / stageScale }
  }

  // shift+drag on empty canvas draws a selection box instead of panning; shift+click a room
  // toggles it in the multi-select set (see the room Group's onClick below)
  function handleStageMouseDown(e) {
    if (!isShiftHeld) return
    const stage = e.target.getStage()
    if (e.target !== stage) return
    const world = stagePointerToWorld(stage)
    if (!world) return
    setMarquee({ x1: world.x, y1: world.y, x2: world.x, y2: world.y })
  }

  function handleStageMouseMove(e) {
    if (!marquee) return
    const world = stagePointerToWorld(e.target.getStage())
    if (!world) return
    setMarquee((m) => (m ? { ...m, x2: world.x, y2: world.y } : m))
  }

  function handleStageMouseUp() {
    if (!marquee) return
    const dragDist = Math.hypot(marquee.x2 - marquee.x1, marquee.y2 - marquee.y1)
    if (dragDist > 3) setSelectedRoomIds(roomsInMarquee(rooms, marquee, SCALE, PADDING))
    setMarquee(null)
  }

  // plain click on empty canvas clears the selection; shift-click on empty canvas is a marquee
  // drag (or a no-op click) handled above, so it's left alone here
  function handleStageClick(e) {
    if (isShiftHeld) return
    if (e.target !== e.target.getStage()) return
    selectRoom(null)
  }

  function resizeRoomForEdge(e, roomId, edge) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null

    const rotation = room.rotation ?? 0
    const centerX = (room.x + room.width / 2) * SCALE + PADDING
    const centerY = (room.y + room.height / 2) * SCALE + PADDING
    const rawHandle = { x: e.target.x() + HANDLE_SIZE / 2, y: e.target.y() + HANDLE_SIZE / 2 }
    // undo the room's own rotation so the rest of the math can pretend it's axis-aligned
    const local = rotation ? rotateAround(rawHandle.x, rawHandle.y, centerX, centerY, -rotation) : rawHandle
    const pointerX = (local.x - PADDING) / SCALE
    const pointerY = (local.y - PADDING) / SCALE

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
    const [rawHx, rawHy] = positions[edge]
    // re-apply the rotation (around the room's possibly-moved new center) so the handle lands
    // back on the visually rotated edge instead of where it'd be for an unrotated room
    const newCenterX = pixelX + pixelW / 2
    const newCenterY = pixelY + pixelH / 2
    const { x: hx, y: hy } = rotation
      ? rotateAround(rawHx, rawHy, newCenterX, newCenterY, rotation)
      : { x: rawHx, y: rawHy }
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

  // same idea as resizeRoomForEdge, but for an L-shaped room's 6 edges: the 4 outer edges resize
  // the bounding box like a rectangle's, while notchV/notchH instead grow or shrink the notch.
  // Each is clamped against the other so the L never inverts.
  function resizeLRoomForEdge(e, roomId, edge) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null

    const rotation = room.rotation ?? 0
    const centerX = (room.x + room.width / 2) * SCALE + PADDING
    const centerY = (room.y + room.height / 2) * SCALE + PADDING
    const rawHandle = { x: e.target.x() + HANDLE_SIZE / 2, y: e.target.y() + HANDLE_SIZE / 2 }
    const local = rotation ? rotateAround(rawHandle.x, rawHandle.y, centerX, centerY, -rotation) : rawHandle
    const pointerX = (local.x - PADDING) / SCALE
    const pointerY = (local.y - PADDING) / SCALE

    let { x, y, width, height, notchWidth, notchHeight } = room

    if (edge === 'top') {
      const minHeight = MIN_ROOM_SIZE + notchHeight
      const newY = Math.min(pointerY, room.y + room.height - minHeight)
      height = room.y + room.height - newY
      y = newY
    } else if (edge === 'bottom') {
      height = Math.max(MIN_ROOM_SIZE + notchHeight, pointerY - room.y)
    } else if (edge === 'left') {
      const minWidth = MIN_ROOM_SIZE + notchWidth
      const newX = Math.min(pointerX, room.x + room.width - minWidth)
      width = room.x + room.width - newX
      x = newX
    } else if (edge === 'right') {
      width = Math.max(MIN_ROOM_SIZE + notchWidth, pointerX - room.x)
    } else if (edge === 'notchV') {
      const localX = pointerX - room.x
      notchWidth = Math.min(width - MIN_ROOM_SIZE, Math.max(MIN_NOTCH, width - localX))
    } else if (edge === 'notchH') {
      const localY = pointerY - room.y
      notchHeight = Math.min(height - MIN_ROOM_SIZE, Math.max(MIN_NOTCH, localY))
    }

    const pixelX = x * SCALE + PADDING
    const pixelY = y * SCALE + PADDING
    const [rawHx, rawHy] = lEdgeMidpoint(pixelX, pixelY, width * SCALE, height * SCALE, notchWidth * SCALE, notchHeight * SCALE, edge)
    const newCenterX = pixelX + (width * SCALE) / 2
    const newCenterY = pixelY + (height * SCALE) / 2
    const { x: hx, y: hy } = rotation
      ? rotateAround(rawHx, rawHy, newCenterX, newCenterY, rotation)
      : { x: rawHx, y: rawHy }
    e.target.x(hx - HANDLE_SIZE / 2)
    e.target.y(hy - HANDLE_SIZE / 2)

    return { x, y, width, height, notchWidth, notchHeight }
  }

  function handleLResizeMove(e, roomId, edge) {
    const rect = resizeLRoomForEdge(e, roomId, edge)
    if (rect) updateRoom(roomId, rect)
  }

  function handleLResizeEnd(e, roomId, edge) {
    const rect = resizeLRoomForEdge(e, roomId, edge)
    if (!rect) return
    updateRoom(roomId, {
      x: Math.round(rect.x * 10) / 10,
      y: Math.round(rect.y * 10) / 10,
      width: Math.round(rect.width * 10) / 10,
      height: Math.round(rect.height * 10) / 10,
      notchWidth: Math.round(rect.notchWidth * 10) / 10,
      notchHeight: Math.round(rect.notchHeight * 10) / 10,
    })
  }

  // angle of the drag handle relative to the room's center — 0° is straight up, increasing
  // clockwise (matching Konva's `rotation`) — snapped to the nearest 45° within
  // SNAP_ANGLE_THRESHOLD_DEG, then repositions the handle back onto its orbit circle at that angle.
  function computeRoomRotation(e, roomId) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null

    const centerX = (room.x + room.width / 2) * SCALE + PADDING
    const centerY = (room.y + room.height / 2) * SCALE + PADDING
    const angleRad = Math.atan2(e.target.x() - centerX, -(e.target.y() - centerY))
    let deg = (angleRad * 180) / Math.PI
    if (deg < 0) deg += 360

    const nearest = Math.round(deg / ROTATE_SNAP_DEG) * ROTATE_SNAP_DEG
    const diff = Math.min(Math.abs(deg - nearest), 360 - Math.abs(deg - nearest))
    const finalDeg = (diff <= SNAP_ANGLE_THRESHOLD_DEG ? nearest : deg) % 360

    const restY = centerY - (room.height * SCALE) / 2 - ROTATE_HANDLE_DIST
    const { x: hx, y: hy } = rotateAround(centerX, restY, centerX, centerY, finalDeg)
    e.target.x(hx)
    e.target.y(hy)

    return finalDeg
  }

  function handleRotateMove(e, roomId) {
    const deg = computeRoomRotation(e, roomId)
    if (deg != null) updateRoom(roomId, { rotation: deg })
  }

  function handleRotateEnd(e, roomId) {
    const deg = computeRoomRotation(e, roomId)
    if (deg != null) updateRoom(roomId, { rotation: Math.round(deg * 10) / 10 })
  }

  function findInteriorWall(roomId, wallId) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null
    const wall = (room.interiorWalls ?? []).find((w) => w.id === wallId)
    if (!wall) return null
    return { room, wall }
  }

  // Konva reports drag position as the TOTAL offset since drag-start, not a per-frame delta, so
  // this must add that offset onto the wall's ORIGINAL position — adding it onto the live store
  // value (already updated by the previous move) double-counts every frame and the wall
  // accelerates away from the cursor. Snapshotting the start once (here) is the same fix
  // groupDragRef uses for multi-room dragging.
  function startInteriorWallBodyDrag(roomId, wallId) {
    const found = findInteriorWall(roomId, wallId)
    if (!found) return
    const { room, wall } = found
    wallBodyDragRef.current = {
      roomId,
      wallId,
      x1: wall.x1,
      y1: wall.y1,
      x2: wall.x2,
      y2: wall.y2,
      roomWidth: room.width,
      roomHeight: room.height,
    }
  }

  function computeInteriorWallBodyMove(e, roomId, wallId) {
    const gd = wallBodyDragRef.current
    if (!gd || gd.roomId !== roomId || gd.wallId !== wallId) return null

    const dxM = e.target.x() / SCALE
    const dyM = e.target.y() / SCALE
    return computeWallBodyTranslate(gd, gd.roomWidth, gd.roomHeight, dxM, dyM)
  }

  function handleInteriorWallBodyMove(e, roomId, wallId) {
    const rect = computeInteriorWallBodyMove(e, roomId, wallId)
    if (rect) updateInteriorWall(roomId, wallId, rect)
  }

  function handleInteriorWallBodyEnd(e, roomId, wallId) {
    const rect = computeInteriorWallBodyMove(e, roomId, wallId)
    wallBodyDragRef.current = null
    e.target.x(0)
    e.target.y(0)
    if (!rect) return
    updateInteriorWall(roomId, wallId, {
      x1: Math.round(rect.x1 * 10) / 10,
      y1: Math.round(rect.y1 * 10) / 10,
      x2: Math.round(rect.x2 * 10) / 10,
      y2: Math.round(rect.y2 * 10) / 10,
    })
  }

  function moveInteriorWallEndpoint(e, roomId, wallId, endpoint) {
    const found = findInteriorWall(roomId, wallId)
    if (!found) return null
    const { room, wall } = found

    const rawX = e.target.x() / SCALE
    const rawY = e.target.y() / SCALE
    const { x, y, updates } = computeWallEndpointMove(room, wall, endpoint, rawX, rawY)

    e.target.x(x * SCALE)
    e.target.y(y * SCALE)

    return updates
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
        draggable={!isShiftHeld}
        onDragEnd={(e) => {
          // ignore drags bubbling up from a room/wall, only handle the Stage's own pan drag
          if (e.target !== e.currentTarget) return
          setStagePos({ x: e.target.x(), y: e.target.y() })
        }}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
      >
        <Layer>
          {rooms.map((room) => {
            const isSelected = selectedRoomIds.includes(room.id)
            const pixelX = room.x * SCALE + PADDING
            const pixelY = room.y * SCALE + PADDING
            const pixelW = room.width * SCALE
            const pixelH = room.height * SCALE
            const isL = room.shape === 'L'
            const pixelNW = isL ? room.notchWidth * SCALE : 0
            const pixelNH = isL ? room.notchHeight * SCALE : 0
            const hasAnyWall = Object.values(room.walls ?? DEFAULT_WALLS).some(Boolean)

            return (
              <Group
                key={room.id}
                x={pixelX + pixelW / 2}
                y={pixelY + pixelH / 2}
                offsetX={pixelW / 2}
                offsetY={pixelH / 2}
                rotation={room.rotation ?? 0}
                draggable
                onDragStart={(e) => startGroupDrag(e, room.id)}
                onDragMove={(e) => handleGroupDragMove(e, room.id)}
                onDragEnd={(e) => handleGroupDragEnd(e, room.id)}
                onClick={(e) => (e.evt.shiftKey ? toggleRoomSelection(room.id) : selectRoom(room.id))}
              >
                {isL ? (
                  <Line
                    points={getLPolygon(pixelW, pixelH, pixelNW, pixelNH).flatMap((p) => [p.x, p.y])}
                    closed
                    fill={room.floorColor}
                    stroke={isSelected && !hasAnyWall ? color.brand : 'transparent'}
                    strokeWidth={1.5}
                    dash={hasAnyWall ? undefined : [5, 4]}
                  />
                ) : (
                  <Rect
                    width={pixelW}
                    height={pixelH}
                    fill={room.floorColor}
                    stroke={isSelected && !hasAnyWall ? color.brand : 'transparent'}
                    strokeWidth={1.5}
                    dash={hasAnyWall ? undefined : [5, 4]}
                  />
                )}

                {isL ? (
                  <LRoomWalls
                    room={room}
                    pixelW={pixelW}
                    pixelH={pixelH}
                    pixelNW={pixelNW}
                    pixelNH={pixelNH}
                    isSelected={isSelected}
                    color={color}
                  />
                ) : (
                  <RoomWalls room={room} pixelW={pixelW} pixelH={pixelH} isSelected={isSelected} color={color} />
                )}

                <InteriorWalls
                  room={room}
                  selectedWallId={selectedInteriorWallId}
                  color={color}
                  onSelectWall={selectInteriorWall}
                  onBodyStart={startInteriorWallBodyDrag}
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
                  text={`${formatLength(room.width, unit)} × ${formatLength(room.height, unit)}`}
                  width={pixelW}
                  y={pixelH - 20}
                  align="center"
                  fontSize={10}
                  fill={color.muted}
                  fontFamily={font}
                  listening={false}
                />

                {isSelected && (
                  <Line
                    points={[pixelW / 2, 0, pixelW / 2, -ROTATE_HANDLE_DIST]}
                    stroke={color.brand}
                    strokeWidth={1.5}
                    listening={false}
                  />
                )}
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
              const rotation = room.rotation ?? 0
              const centerX = pixelX + pixelW / 2
              const centerY = pixelY + pixelH / 2
              const rotated = (px, py) =>
                rotation ? rotateAround(px, py, centerX, centerY, rotation) : { x: px, y: py }

              const resizeHandles = (() => {
                if (room.shape === 'L') {
                  const pixelNW = room.notchWidth * SCALE
                  const pixelNH = room.notchHeight * SCALE
                  return L_WALL_KEYS.map((edge) => {
                    const [rawX, rawY] = lEdgeMidpoint(pixelX, pixelY, pixelW, pixelH, pixelNW, pixelNH, edge)
                    const { x: hx, y: hy } = rotated(rawX, rawY)
                    return (
                      <ResizeHandle
                        key={`${room.id}-${edge}`}
                        roomId={room.id}
                        edge={edge}
                        x={hx}
                        y={hy}
                        cursor={L_EDGE_CURSORS[edge]}
                        color={color}
                        onResizeMove={handleLResizeMove}
                        onResizeEnd={handleLResizeEnd}
                      />
                    )
                  })
                }

                const positions = {
                  top: [pixelX + pixelW / 2, pixelY],
                  bottom: [pixelX + pixelW / 2, pixelY + pixelH],
                  left: [pixelX, pixelY + pixelH / 2],
                  right: [pixelX + pixelW, pixelY + pixelH / 2],
                }
                return WALL_KEYS.map((edge) => {
                  const [rawX, rawY] = positions[edge]
                  const { x: hx, y: hy } = rotated(rawX, rawY)
                  return (
                    <ResizeHandle
                      key={`${room.id}-${edge}`}
                      roomId={room.id}
                      edge={edge}
                      x={hx}
                      y={hy}
                      cursor={EDGE_CURSORS[edge]}
                      color={color}
                      onResizeMove={handleResizeMove}
                      onResizeEnd={handleResizeEnd}
                    />
                  )
                })
              })()

              const { x: rotateX, y: rotateY } = rotated(centerX, pixelY - ROTATE_HANDLE_DIST)

              return (
                <Group key={`${room.id}-handles`}>
                  {resizeHandles}
                  <Circle
                    x={rotateX}
                    y={rotateY}
                    radius={ROTATE_HANDLE_RADIUS}
                    fill={color.bg}
                    stroke={color.brand}
                    strokeWidth={1.5}
                    draggable
                    hitStrokeWidth={16}
                    onDragMove={(e) => handleRotateMove(e, room.id)}
                    onDragEnd={(e) => handleRotateEnd(e, room.id)}
                    onMouseEnter={(e) => {
                      e.target.getStage().container().style.cursor = 'grab'
                    }}
                    onMouseLeave={(e) => {
                      e.target.getStage().container().style.cursor = 'default'
                    }}
                  />
                </Group>
              )
            })}

          {marquee && (
            <Rect
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
              fill={color.brand}
              opacity={0.12}
              stroke={color.brand}
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}
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

      {selectedRoomIds.length > 1 && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: color.bg,
            padding: '8px 12px',
            borderRadius: radius.pill,
            border: `1px solid ${color.border}`,
            boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
            fontSize: 12,
            color: color.text,
          }}
        >
          {selectedRoomIds.length} rooms selected — drag any one to move them together
          <button
            onClick={() => setSelectedRoomIds([])}
            style={{
              background: 'transparent',
              border: 'none',
              color: color.brand,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              padding: 0,
            }}
          >
            Clear
          </button>
        </div>
      )}

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
        Scroll to zoom · Drag empty space to pan · Drag a room to reposition or its edge handles to resize it · Shift-click rooms (or shift-drag a box) to multi-select, then drag any of them to move the group · Click an interior wall to select just that wall, then drag it to move it or its round end handles to rotate/stretch it
      </div>
    </div>
  )
}
