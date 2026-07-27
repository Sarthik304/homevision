import { Stage, Layer, Rect, Text, Group } from 'react-konva'
import useHouseStore from '../../store/useHouseStore'
import { color, font } from '../../theme'

const SCALE = 20
const PADDING = 40

export default function FloorPlanEditor() {
  const { rooms, selectedRoomId, selectRoom, updateRoom } = useHouseStore()

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
                <Rect
                  width={pixelW}
                  height={pixelH}
                  fill={room.wallColor}
                  stroke={isSelected ? color.brand : color.muted}
                  strokeWidth={isSelected ? 2.5 : 1.5}
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
