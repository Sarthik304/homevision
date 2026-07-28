import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Rect, Text, Group, Line } from 'react-konva'
import useHouseStore from '../../store/useHouseStore'
import { color, font, radius } from '../../theme'

const SCALE = 20
const PADDING = 40
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_STEP = 1.15

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }
const WALL_KEYS = ['top', 'bottom', 'left', 'right']

// Along a wall of pixel length `lengthPx`, cut out the door openings and
// return the remaining solid stretches (as [start, end] pixel ranges).
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

function RoomWalls({ room, pixelW, pixelH, isSelected }) {
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

function ZoomButton({ children, onClick, title }) {
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
  const { rooms, selectedRoomId, selectRoom, updateRoom } = useHouseStore()
  const containerRef = useRef(null)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 })
  const [stageScale, setStageScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const updateSize = () => setStageSize({ width: el.clientWidth, height: el.clientHeight })
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function handleDragEnd(e, roomId) {
    const newX = Math.round((e.target.x() - PADDING) / SCALE)
    const newY = Math.round((e.target.y() - PADDING) / SCALE)
    updateRoom(roomId, { x: newX, y: newY })
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
        onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
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
                onDragEnd={(e) => handleDragEnd(e, room.id)}
                onClick={() => selectRoom(room.id)}
              >
                <Rect
                  width={pixelW}
                  height={pixelH}
                  fill={room.floorColor}
                  stroke={isSelected ? color.brand : 'transparent'}
                  strokeWidth={1.5}
                  dash={hasAnyWall ? undefined : [5, 4]}
                />

                <RoomWalls room={room} pixelW={pixelW} pixelH={pixelH} isSelected={isSelected} />

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
                />

                <Text
                  text={`${room.width}m × ${room.height}m`}
                  width={pixelW}
                  y={pixelH - 20}
                  align="center"
                  fontSize={10}
                  fill={color.muted}
                  fontFamily={font}
                />
              </Group>
            )
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
        <ZoomButton title="Zoom in" onClick={() => zoomAtCenter(stageScale * ZOOM_STEP)}>
          +
        </ZoomButton>
        <ZoomButton title="Zoom out" onClick={() => zoomAtCenter(stageScale / ZOOM_STEP)}>
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
        <ZoomButton title="Reset view" onClick={resetView}>
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
        Scroll to zoom · Drag empty space to pan · Drag a room to reposition
      </div>
    </div>
  )
}
