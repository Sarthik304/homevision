import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva'
import { useShallow } from 'zustand/react/shallow'
import useHouseStore from '../../store/useHouseStore'
import { getColors, font, radius } from '../../theme'
import { SCALE, PADDING, MIN_ROOM_SIZE } from '../../constants/floorPlan'
import { getLEdges, getLPolygon, MIN_NOTCH, L_WALL_KEYS, DEFAULT_L_WALLS } from '../../constants/lshape'
import { QUAD_CORNER_KEYS, getQuadEdges, getQuadPolygon, quadCornersOf } from '../../constants/quad'
import { rotateAround, getRoomAABB, getSnappedPosition } from '../../utils/roomGeometry'
import {
  SNAP_ANGLE_THRESHOLD_DEG,
  computeWallBodyTranslate,
  computeWallEndpointMove,
  roomsInMarquee,
} from '../../utils/interiorWallGeometry'
import { snapQuadCorner } from '../../utils/quadGeometry'
import { formatLength } from '../../utils/units'
import { MIN_FURNITURE_SIZE, resizeFurnitureCorner } from '../../utils/furnitureGeometry'
import { eventClientXY } from '../../utils/pointerPosition'
import DimensionInput from '../ui/DimensionInput'
import useIsMobile from '../../hooks/useIsMobile'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_STEP = 1.15
const HANDLE_SIZE = 9 // px, edge resize handle size
const EDGE_CURSORS = { top: 'ns-resize', bottom: 'ns-resize', left: 'ew-resize', right: 'ew-resize' }
const L_EDGE_CURSORS = { top: 'ns-resize', bottom: 'ns-resize', notchH: 'ns-resize', left: 'ew-resize', right: 'ew-resize', notchV: 'ew-resize' }
const INTERIOR_HANDLE_RADIUS = 7 // px, interior wall endpoint handle
const ROTATE_SNAP_DEG = 45 // degrees per rotation handle "click"
const ROTATE_HANDLE_DIST = 24 // px above the room's top edge for its rotation handle
const ROTATE_HANDLE_RADIUS = 6 // px

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }
const WALL_KEYS = ['top', 'bottom', 'left', 'right']
const FURNITURE_CORNERS = ['tl', 'tr', 'bl', 'br']
const FURNITURE_CORNER_CURSORS = { tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize' }
const DIMENSION_POPUP_WIDTH = 180
const DIMENSION_POPUP_HEIGHT = 190
// manual double-click detection (Konva's dblclick is unreliable on draggable shapes)
const DOUBLE_CLICK_MS = 350

// cuts door gaps out of a wall, returns remaining [start, end] solid stretches
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

// generalized wall/door/window rendering for any room whose boundary is a list of straight edges
// (an L-shaped room's 6 edges, or a freeform quad's 4) — everything below is edge-vector math
// with no assumption the edge is horizontal/vertical, so it works at any angle
function EdgeWalls({ edges, walls, doors, windows, isSelected, color }) {
  return edges.filter((edge) => walls[edge.key]).map((edge) => {
    const dx = edge.to.x - edge.from.x
    const dy = edge.to.y - edge.from.y
    const lengthPx = Math.hypot(dx, dy)
    if (lengthPx < 1) return null
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

function LRoomWalls({ room, pixelW, pixelH, pixelNW, pixelNH, isSelected, color }) {
  return (
    <EdgeWalls
      edges={getLEdges(pixelW, pixelH, pixelNW, pixelNH)}
      walls={room.walls ?? DEFAULT_L_WALLS}
      doors={room.doors ?? []}
      windows={room.windows ?? []}
      isSelected={isSelected}
      color={color}
    />
  )
}

function QuadRoomWalls({ room, pixelCorners, isSelected, color }) {
  return (
    <EdgeWalls
      edges={getQuadEdges(pixelCorners)}
      walls={room.walls ?? DEFAULT_WALLS}
      doors={room.doors ?? []}
      windows={room.windows ?? []}
      isSelected={isSelected}
      color={color}
    />
  )
}

// freeform two-endpoint interior partition walls (not tied to a room's boundary edges)
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

        {/* click target + drag rail for the whole wall */}
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

// dummy furniture: a draggable + corner-resizable box per item, clamped to the room's own footprint
function RoomFurniture({ room, color, selectedFurnitureId, onSelect, updateFurniture, onResizeMove, onResizeEnd }) {
  const items = room.furniture ?? []

  return items.map((item) => {
    const isSelected = item.id === selectedFurnitureId
    const pixelX = item.x * SCALE
    const pixelY = item.y * SCALE
    const pixelW = item.width * SCALE
    const pixelD = item.depth * SCALE
    const corners = {
      tl: [pixelX, pixelY],
      tr: [pixelX + pixelW, pixelY],
      bl: [pixelX, pixelY + pixelD],
      br: [pixelX + pixelW, pixelY + pixelD],
    }

    const clampToRoom = (e) => {
      const rawX = e.target.x() / SCALE
      const rawY = e.target.y() / SCALE
      const x = Math.min(Math.max(0, rawX), Math.max(0, room.width - item.width))
      const y = Math.min(Math.max(0, rawY), Math.max(0, room.height - item.depth))
      e.target.x(x * SCALE)
      e.target.y(y * SCALE)
      return { x, y }
    }

    return (
      <Group key={item.id}>
        <Rect
          x={pixelX}
          y={pixelY}
          width={pixelW}
          height={pixelD}
          fill={item.color}
          opacity={0.85}
          stroke={isSelected ? color.brand : color.text}
          strokeWidth={isSelected ? 2 : 1}
          cornerRadius={3}
          draggable
          onClick={(e) => {
            e.cancelBubble = true
            onSelect(room.id, item.id, e.evt)
          }}
          onDragMove={clampToRoom}
          onDragEnd={(e) => {
            const { x, y } = clampToRoom(e)
            updateFurniture(room.id, item.id, { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 })
          }}
          onMouseEnter={(e) => {
            e.target.getStage().container().style.cursor = 'move'
          }}
          onMouseLeave={(e) => {
            e.target.getStage().container().style.cursor = 'default'
          }}
        />
        <Text
          text={item.label}
          x={pixelX}
          y={pixelY + pixelD / 2 - 6}
          width={pixelW}
          align="center"
          fontSize={10}
          fill={color.text}
          fontFamily={font}
          listening={false}
        />

        {isSelected &&
          FURNITURE_CORNERS.map((corner) => {
            const [hx, hy] = corners[corner]
            return (
              <Rect
                key={corner}
                x={hx - HANDLE_SIZE / 2}
                y={hy - HANDLE_SIZE / 2}
                width={HANDLE_SIZE}
                height={HANDLE_SIZE}
                fill={color.bg}
                stroke={color.brand}
                strokeWidth={1.5}
                cornerRadius={2}
                draggable
                hitStrokeWidth={6}
                onDragMove={(e) => onResizeMove(e, room.id, item.id, corner)}
                onDragEnd={(e) => onResizeEnd(e, room.id, item.id, corner)}
                onMouseEnter={(e) => {
                  e.target.getStage().container().style.cursor = FURNITURE_CORNER_CURSORS[corner]
                }}
                onMouseLeave={(e) => {
                  e.target.getStage().container().style.cursor = 'default'
                }}
              />
            )
          })}
      </Group>
    )
  })
}

// dumb node; x/y is the handle's target midpoint in stage-pixel space
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

// midpoint of one of an L-shaped room's 6 edges, offset by pixelX/pixelY
function lEdgeMidpoint(pixelX, pixelY, pixelW, pixelH, pixelNW, pixelNH, edgeKey) {
  const edge = getLEdges(pixelW, pixelH, pixelNW, pixelNH).find((e) => e.key === edgeKey)
  return [pixelX + (edge.from.x + edge.to.x) / 2, pixelY + (edge.from.y + edge.to.y) / 2]
}

// a quad room's corner-drag handle — solid brand-colored, distinct from the hollow square
// edge-resize handles (resize the box) and hollow circular rotate handle (spin the room).
// Uses plain mousedown/touchstart (see startQuadCornerDrag) rather than Konva's own
// draggable/onDragMove, which is what avoided a real reported bug where corner-dragging
// silently didn't work in real browsers despite behaving correctly under automated testing.
function QuadCornerHandle({ roomId, cornerKey, x, y, color, onDragStart }) {
  const start = (e) => {
    e.cancelBubble = true
    onDragStart(e.target.getStage(), roomId, cornerKey)
  }
  return (
    <Circle
      x={x}
      y={y}
      radius={INTERIOR_HANDLE_RADIUS + 2}
      fill={color.brand}
      stroke={color.bg}
      strokeWidth={2}
      hitStrokeWidth={30}
      onMouseDown={start}
      onTouchStart={start}
      onMouseEnter={(e) => {
        e.target.getStage().container().style.cursor = 'crosshair'
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
      className="pixel-btn"
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

// state selector for useShallow
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
  selectedFurnitureId: s.selectedFurnitureId,
  selectFurniture: s.selectFurniture,
  updateFurniture: s.updateFurniture,
  updateQuadCorner: s.updateQuadCorner,
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
    selectedFurnitureId,
    selectFurniture,
    updateFurniture,
    updateQuadCorner,
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
  const [marquee, setMarquee] = useState(null) // rubber-band selection box, world-pixel space
  const [dimensionPopup, setDimensionPopup] = useState(null) // { roomId, furnitureId, x, y } | null
  const groupDragRef = useRef(null) // group-drag start snapshot (see handleGroupDragMove)
  const wallBodyDragRef = useRef(null) // interior wall drag start snapshot (see startInteriorWallBodyDrag)
  const furnitureClickRef = useRef({ id: null, time: 0 }) // last furniture click, for double-click detection
  const pinchRef = useRef(null) // two-finger pinch-zoom start snapshot (see the touchmove listener below)
  const stageRef = useRef(null)
  const stageScaleRef = useRef(stageScale) // mirrors state for the native touch listeners' stable closures
  const stagePosRef = useRef(stagePos)
  stageScaleRef.current = stageScale
  stagePosRef.current = stagePos
  const isMobile = useIsMobile()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Shift') setIsShiftHeld(true)
      if (e.key === 'Escape') {
        if (dimensionPopup) setDimensionPopup(null)
        else setSelectedRoomIds([])
      }
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
  }, [setSelectedRoomIds, dimensionPopup])

  // syncs viewCenter so new rooms spawn where the user is looking
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

  // drags/snaps a room; works in AABB terms since rooms off the 90° grid skip axis-aligned snapping
  function handleDragMove(e, roomId) {
    if (e.target !== e.currentTarget) return // ignore bubbled drags from a nested interior wall
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

  // starts a group drag: multi-selected rooms translate together, unsnapped
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

  // converts a screen pointer position to world-pixel space, undoing pan/zoom
  function stagePointerToWorld(stage) {
    const pointer = stage.getPointerPosition()
    if (!pointer) return null
    return { x: (pointer.x - stagePos.x) / stageScale, y: (pointer.y - stagePos.y) / stageScale }
  }

  // shift+drag on empty canvas starts a marquee selection box instead of panning
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

  // plain click on empty canvas clears the selection
  function handleStageClick(e) {
    if (isShiftHeld) return
    if (e.target !== e.target.getStage()) return
    selectRoom(null)
    setDimensionPopup(null)
  }

  // selects furniture; two clicks on the same item within DOUBLE_CLICK_MS open the dimensions popup
  function handleFurnitureClick(roomId, furnitureId, nativeEvent) {
    selectFurniture(furnitureId)

    const now = performance.now()
    const last = furnitureClickRef.current
    if (last.id === furnitureId && now - last.time < DOUBLE_CLICK_MS) {
      furnitureClickRef.current = { id: null, time: 0 }
      openDimensionPopup(roomId, furnitureId, nativeEvent)
    } else {
      furnitureClickRef.current = { id: furnitureId, time: now }
      setDimensionPopup(null)
    }
  }

  // opens a popup to type a furniture item's exact width/depth/height
  function openDimensionPopup(roomId, furnitureId, nativeEvent) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const { clientX, clientY } = eventClientXY(nativeEvent)
    const rawX = clientX - rect.left
    const rawY = clientY - rect.top
    setDimensionPopup({
      roomId,
      furnitureId,
      x: Math.min(Math.max(8, rawX), rect.width - DIMENSION_POPUP_WIDTH - 8),
      y: Math.min(Math.max(8, rawY), rect.height - DIMENSION_POPUP_HEIGHT - 8),
    })
  }

  function resizeRoomForEdge(e, roomId, edge) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null

    const rotation = room.rotation ?? 0
    const centerX = (room.x + room.width / 2) * SCALE + PADDING
    const centerY = (room.y + room.height / 2) * SCALE + PADDING
    const rawHandle = { x: e.target.x() + HANDLE_SIZE / 2, y: e.target.y() + HANDLE_SIZE / 2 }
    const local = rotation ? rotateAround(rawHandle.x, rawHandle.y, centerX, centerY, -rotation) : rawHandle // undo rotation
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
    // re-apply rotation around the room's new center so the handle lands on the visual edge
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

  // like resizeRoomForEdge for an L-shaped room's 6 edges: outer edges resize the bounding box, notchV/notchH resize the notch
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

  // resizes a furniture item by dragging one of its corners, keeping the opposite corner fixed
  function resizeFurnitureForCorner(e, roomId, furnitureId, corner) {
    const room = rooms.find((r) => r.id === roomId)
    const item = room?.furniture?.find((f) => f.id === furnitureId)
    if (!room || !item) return null

    const pointerX = (e.target.x() + HANDLE_SIZE / 2) / SCALE
    const pointerY = (e.target.y() + HANDLE_SIZE / 2) / SCALE
    const rect = resizeFurnitureCorner(item, corner, pointerX, pointerY, room.width, room.height)

    const cornerPixel = {
      tl: [rect.x, rect.y],
      tr: [rect.x + rect.width, rect.y],
      bl: [rect.x, rect.y + rect.depth],
      br: [rect.x + rect.width, rect.y + rect.depth],
    }[corner]
    e.target.x(cornerPixel[0] * SCALE - HANDLE_SIZE / 2)
    e.target.y(cornerPixel[1] * SCALE - HANDLE_SIZE / 2)

    return rect
  }

  function handleFurnitureResizeMove(e, roomId, furnitureId, corner) {
    const rect = resizeFurnitureForCorner(e, roomId, furnitureId, corner)
    if (rect) updateFurniture(roomId, furnitureId, rect)
  }

  function handleFurnitureResizeEnd(e, roomId, furnitureId, corner) {
    const rect = resizeFurnitureForCorner(e, roomId, furnitureId, corner)
    if (!rect) return
    updateFurniture(roomId, furnitureId, {
      x: Math.round(rect.x * 10) / 10,
      y: Math.round(rect.y * 10) / 10,
      width: Math.round(rect.width * 10) / 10,
      depth: Math.round(rect.depth * 10) / 10,
    })
  }

  // angle of the drag handle around the room's center, snapped to the nearest 45°
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

  // given a point in world-pixel space (meters*SCALE+PADDING, matching pixelX/centerX elsewhere),
  // returns the corresponding local-space point (meters, relative to the room's own x/y) for one
  // of a quad room's corners, unbounded — a corner can be dragged inside the box (distorting the
  // shape) or out past it (stretching a point outward) — snapped to the box's corners/
  // edge-midpoints/center when close, which is what makes it easy to land exactly on a rhombus
  function computeQuadCornerPoint(point, roomId) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null

    const rotation = room.rotation ?? 0
    const centerX = (room.x + room.width / 2) * SCALE + PADDING
    const centerY = (room.y + room.height / 2) * SCALE + PADDING
    const local = rotation ? rotateAround(point.x, point.y, centerX, centerY, -rotation) : point
    const pointerX = (local.x - PADDING) / SCALE - room.x
    const pointerY = (local.y - PADDING) / SCALE - room.y

    return snapQuadCorner(room.width, room.height, pointerX, pointerY)
  }

  // Quad corner-dragging is driven by plain mousedown/touchstart + window-level move/up listeners
  // rather than Konva's own draggable/onDragMove — deliberately bypassing Konva's native drag
  // machinery (see the pinch-zoom listeners above for this file's other case of doing the same),
  // since the corner handle only needs to read the pointer position each frame and let React's own
  // re-render move it, with no dependency on Konva's drag-state internals working a given way.
  function startQuadCornerDrag(stage, roomId, cornerKey) {
    const container = containerRef.current
    if (!container) return
    stage.container().style.cursor = 'crosshair'

    function pointFromEvent(nativeEvent) {
      const rect = container.getBoundingClientRect()
      const { clientX, clientY } = eventClientXY(nativeEvent)
      return {
        x: (clientX - rect.left - stagePosRef.current.x) / stageScaleRef.current,
        y: (clientY - rect.top - stagePosRef.current.y) / stageScaleRef.current,
      }
    }

    function handleMove(nativeEvent) {
      nativeEvent.preventDefault()
      const snapped = computeQuadCornerPoint(pointFromEvent(nativeEvent), roomId)
      if (snapped) updateQuadCorner(roomId, cornerKey, snapped)
    }

    function handleEnd(nativeEvent) {
      const snapped = computeQuadCornerPoint(pointFromEvent(nativeEvent), roomId)
      if (snapped) {
        updateQuadCorner(roomId, cornerKey, {
          x: Math.round(snapped.x * 10) / 10,
          y: Math.round(snapped.y * 10) / 10,
        })
      }
      stage.container().style.cursor = 'default'
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
  }

  function findInteriorWall(roomId, wallId) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return null
    const wall = (room.interiorWalls ?? []).find((w) => w.id === wallId)
    if (!wall) return null
    return { room, wall }
  }

  // snapshots the wall's start position — Konva's drag offset is total-since-start, not per-frame
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
    if (!pointer) return
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

  // two-finger pinch to zoom/pan. Konva suppresses all its own pointer-event dispatch while
  // Konva.isDragging() is true (a single-finger touch starts dragging the Stage before a second
  // finger lands), which silently swallows a Stage onTouchMove prop — so this binds capture-phase
  // native listeners on the container, ahead of Konva's own bubble-phase listeners on the canvas,
  // and stops propagation for any 2-finger event so Konva never sees (or drags on) multi-touch.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e) {
      if (e.touches.length < 2) return
      e.stopPropagation()
      const stage = stageRef.current
      if (stage?.isDragging()) stage.stopDrag()
    }

    function onTouchMove(e) {
      if (e.touches.length < 2) return
      e.preventDefault()
      e.stopPropagation()

      const rect = el.getBoundingClientRect()
      const [touch1, touch2] = e.touches
      const p1 = { x: touch1.clientX - rect.left, y: touch1.clientY - rect.top }
      const p2 = { x: touch2.clientX - rect.left, y: touch2.clientY - rect.top }
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y)

      const last = pinchRef.current
      if (!last) {
        pinchRef.current = { center, dist }
        return
      }

      const oldScale = stageScaleRef.current
      const oldPos = stagePosRef.current
      const focus = { x: (center.x - oldPos.x) / oldScale, y: (center.y - oldPos.y) / oldScale }
      const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, oldScale * (dist / last.dist)))

      setStageScale(newScale)
      setStagePos({
        x: center.x - focus.x * newScale + (center.x - last.center.x),
        y: center.y - focus.y * newScale + (center.y - last.center.y),
      })
      pinchRef.current = { center, dist }
    }

    function onTouchEnd(e) {
      if (e.touches.length < 2) pinchRef.current = null
    }

    el.addEventListener('touchstart', onTouchStart, { capture: true })
    el.addEventListener('touchmove', onTouchMove, { capture: true, passive: false })
    el.addEventListener('touchend', onTouchEnd, { capture: true })
    el.addEventListener('touchcancel', onTouchEnd, { capture: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart, { capture: true })
      el.removeEventListener('touchmove', onTouchMove, { capture: true })
      el.removeEventListener('touchend', onTouchEnd, { capture: true })
      el.removeEventListener('touchcancel', onTouchEnd, { capture: true })
    }
  }, [])

  function resetView() {
    setStageScale(1)
    setStagePos({ x: 0, y: 0 })
  }

  const dimensionPopupRoom = dimensionPopup ? rooms.find((r) => r.id === dimensionPopup.roomId) : null
  const dimensionPopupItem = dimensionPopupRoom?.furniture?.find((f) => f.id === dimensionPopup?.furnitureId)

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        background: color.workspace,
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'none', // let Konva own pinch/pan on the canvas instead of the browser
      }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={!isShiftHeld}
        onDragEnd={(e) => {
          if (e.target !== e.currentTarget) return // ignore bubbled drags from a room/wall
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
            const isQuad = room.shape === 'quad'
            const pixelNW = isL ? room.notchWidth * SCALE : 0
            const pixelNH = isL ? room.notchHeight * SCALE : 0
            const pixelCorners = isQuad
              ? Object.fromEntries(
                  QUAD_CORNER_KEYS.map((key) => {
                    const c = quadCornersOf(room)[key]
                    return [key, { x: c.x * SCALE, y: c.y * SCALE }]
                  })
                )
              : null
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
                {isL || isQuad ? (
                  <Line
                    points={(isL
                      ? getLPolygon(pixelW, pixelH, pixelNW, pixelNH)
                      : getQuadPolygon(pixelCorners)
                    ).flatMap((p) => [p.x, p.y])}
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
                ) : isQuad ? (
                  <QuadRoomWalls room={room} pixelCorners={pixelCorners} isSelected={isSelected} color={color} />
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

                <RoomFurniture
                  room={room}
                  color={color}
                  selectedFurnitureId={selectedFurnitureId}
                  onSelect={handleFurnitureClick}
                  updateFurniture={updateFurniture}
                  onResizeMove={handleFurnitureResizeMove}
                  onResizeEnd={handleFurnitureResizeEnd}
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
                const boxHandles = WALL_KEYS.map((edge) => {
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

                if (room.shape !== 'quad') return boxHandles

                // corner-drag handles let a quad's 4 corners move independently, on top of the
                // box-resize handles above (which resize the bounding box the corners live in)
                const corners = quadCornersOf(room)
                const cornerHandles = QUAD_CORNER_KEYS.map((key) => {
                  const corner = corners[key]
                  const rawX = pixelX + corner.x * SCALE
                  const rawY = pixelY + corner.y * SCALE
                  const { x: hx, y: hy } = rotated(rawX, rawY)
                  return (
                    <QuadCornerHandle
                      key={`${room.id}-corner-${key}`}
                      roomId={room.id}
                      cornerKey={key}
                      x={hx}
                      y={hy}
                      color={color}
                      onDragStart={startQuadCornerDrag}
                    />
                  )
                })
                return [...boxHandles, ...cornerHandles]
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

      {dimensionPopup && dimensionPopupItem && (
        <div
          className="pixel-shadow"
          style={{
            position: 'absolute',
            left: dimensionPopup.x,
            top: dimensionPopup.y,
            width: DIMENSION_POPUP_WIDTH,
            background: color.bg,
            border: `1.5px solid ${color.text}`,
            borderRadius: radius.md,
            '--pixel-shadow-color': color.text,
            padding: 10,
            zIndex: 20,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              gap: 6,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: color.text }}>{dimensionPopupItem.label} size</span>
            <button
              onClick={() => setDimensionPopup(null)}
              aria-label="Close"
              style={{
                background: 'transparent',
                border: 'none',
                color: color.muted,
                cursor: 'pointer',
                fontSize: 15,
                lineHeight: 1,
                padding: '2px 4px',
              }}
            >
              ×
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['width', 'Width'],
              ['depth', 'Depth'],
              ['height', 'Height'],
            ].map(([key, label]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: color.muted, display: 'block', marginBottom: 4 }}>
                  {label} ({unit})
                </label>
                <DimensionInput
                  valueMeters={dimensionPopupItem[key]}
                  unit={unit}
                  min={MIN_FURNITURE_SIZE}
                  onCommit={(meters) =>
                    updateFurniture(dimensionPopup.roomId, dimensionPopup.furnitureId, { [key]: meters })
                  }
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    fontSize: 12,
                    border: `1px solid ${color.borderInput}`,
                    borderRadius: radius.sm,
                    background: color.surface,
                    color: color.text,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="pixel-shadow"
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
          border: `1.5px solid ${color.text}`,
          '--pixel-shadow-color': color.text,
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
          className="pixel-shadow"
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
            border: `1.5px solid ${color.text}`,
            '--pixel-shadow-color': color.text,
            fontSize: 12,
            color: color.text,
          }}
        >
          {selectedRoomIds.length} rooms selected — drag any one to move them together
          <button
            className="pixel-btn"
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
          maxWidth: 'calc(100% - 24px)',
          textAlign: 'center',
          fontSize: 12,
          color: color.muted,
        }}
      >
        {isMobile
          ? 'Pinch to zoom · Drag empty space to pan · Drag a room to reposition or its edge handles to resize it'
          : 'Scroll to zoom · Drag empty space to pan · Drag a room to reposition or its edge handles to resize it · Shift-click rooms (or shift-drag a box) to multi-select, then drag any of them to move the group · Click an interior wall to select just that wall, then drag it to move it or its round end handles to rotate/stretch it'}
      </div>
    </div>
  )
}
