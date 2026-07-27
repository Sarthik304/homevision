import { Stage, Layer, Rect, Text, Group } from 'react-konva'
import useHouseStore from '../../store/useHouseStore'
import { color, font } from '../../theme'

// FloorPlanEditor is the top-down 2D view of your house.
// Think of it like graph paper — rooms are rectangles you can see and click.
// Konva makes it easy to draw interactive 2D shapes on a canvas.

const SCALE = 20 // 1 metre = 20 pixels in the editor
const PADDING = 40 // space around the edges

export default function FloorPlanEditor() {
  const { rooms, selectedRoomId, selectRoom, updateRoom } = useHouseStore()

  // Handle dragging a room to reposition it
  function handleDragEnd(e, roomId) {
    const newX = Math.round((e.target.x() - PADDING) / SCALE)
    const newY = Math.round((e.target.y() - PADDING) / SCALE)
    updateRoom(roomId, { x: newX, y: newY })
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: color.workspace,
        overflow: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Stage width={800} height={600}>
        <Layer>
          {rooms.map((room) => {
            const isSelected = room.id === selectedRoomId
            const pixelX = room.x * SCALE + PADDING
            const pixelY = room.y * SCALE + PADDING
            const pixelW = room.width * SCALE
            const pixelH = room.height * SCALE

            return (
              <Group
                key={room.id}
                x={pixelX}
                y={pixelY}
                draggable
                onDragEnd={(e) => handleDragEnd(e, room.id)}
                onClick={() => selectRoom(room.id)}
              >
                {/* Room rectangle */}
                <Rect
                  width={pixelW}
                  height={pixelH}
                  fill={room.wallColor}
                  stroke={isSelected ? color.brand : color.muted}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />

                {/* Room label.
                    Konva draws to a canvas, so it can't inherit the page font —
                    the family has to be passed in explicitly. */}
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

                {/* Dimension labels */}
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
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 12,
          color: color.muted,
        }}
      >
        Click a room to select · Drag to reposition
      </div>
    </div>
  )
}
