import { HexColorPicker } from 'react-colorful'
import { useState } from 'react'
import useHouseStore from '../../store/useHouseStore'
import { color, radius } from '../../theme'

const sectionHeader = {
  fontSize: 11,
  fontWeight: 700,
  color: color.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
}

const fieldLabel = {
  fontSize: 12,
  color: color.muted,
  display: 'block',
  marginBottom: 6,
}

const inputStyle = {
  width: '100%',
  padding: '8px 10px',
  background: color.bg,
  border: `1px solid ${color.borderInput}`,
  borderRadius: radius.sm,
  color: color.text,
  fontSize: 13,
  boxSizing: 'border-box',
}

export default function Sidebar() {
  const {
    rooms,
    selectedRoomId,
    selectRoom,
    updateRoomColor,
    updateRoom,
    addRoom,
    removeRoom,
  } = useHouseStore()

  const [colorTarget, setColorTarget] = useState(null)
  const [hoveredRoomId, setHoveredRoomId] = useState(null)

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)

  return (
    <div
      style={{
        width: 280,
        height: '100%',
        background: color.bg,
        borderLeft: `1px solid ${color.border}`,
        color: color.text,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        gap: 20,
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div>
        <div style={{ ...sectionHeader, marginBottom: 10 }}>Rooms</div>

        {rooms.map((room) => {
          const isSelected = room.id === selectedRoomId
          const isHovered = room.id === hoveredRoomId

          return (
            <div
              key={room.id}
              onClick={() => {
                selectRoom(room.id)
                setColorTarget(null)
              }}
              onMouseEnter={() => setHoveredRoomId(room.id)}
              onMouseLeave={() => setHoveredRoomId(null)}
              style={{
                borderLeft: `3px solid ${isSelected ? color.brand : 'transparent'}`,
                padding: '9px 12px',
                borderRadius: radius.sm,
                marginBottom: 2,
                cursor: 'pointer',
                background: isSelected
                  ? color.brandTint
                  : isHovered
                    ? color.surface
                    : 'transparent',
                color: isSelected ? color.brand : color.text,
                fontWeight: isSelected ? 700 : 400,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'background 0.12s',
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 2,
                  background: room.wallColor,
                  border: `1px solid ${color.border}`,
                  flexShrink: 0,
                }}
              />
              {room.name}
            </div>
          )
        })}

        <button
          onClick={addRoom}
          style={{
            width: '100%',
            padding: '9px',
            marginTop: 12,
            background: color.bg,
            border: `1px solid ${color.text}`,
            borderRadius: radius.pill,
            color: color.text,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          + Add room
        </button>
      </div>

      {selectedRoom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ height: 1, background: color.border }} />

          <div style={sectionHeader}>Edit: {selectedRoom.name}</div>

          <div>
            <label style={fieldLabel}>Room name</label>
            <input
              value={selectedRoom.name}
              onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={fieldLabel}>Wall colour</label>
            <div
              onClick={() => setColorTarget(colorTarget === 'wall' ? null : 'wall')}
              style={{
                width: '100%',
                height: 36,
                borderRadius: radius.sm,
                background: selectedRoom.wallColor,
                cursor: 'pointer',
                border:
                  colorTarget === 'wall'
                    ? `2px solid ${color.brand}`
                    : `1px solid ${color.border}`,
              }}
            />
            {colorTarget === 'wall' && (
              <div style={{ marginTop: 8 }}>
                <HexColorPicker
                  color={selectedRoom.wallColor}
                  onChange={(c) => updateRoomColor(selectedRoom.id, 'wallColor', c)}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          <div>
            <label style={fieldLabel}>Floor colour</label>
            <div
              onClick={() => setColorTarget(colorTarget === 'floor' ? null : 'floor')}
              style={{
                width: '100%',
                height: 36,
                borderRadius: radius.sm,
                background: selectedRoom.floorColor,
                cursor: 'pointer',
                border:
                  colorTarget === 'floor'
                    ? `2px solid ${color.brand}`
                    : `1px solid ${color.border}`,
              }}
            />
            {colorTarget === 'floor' && (
              <div style={{ marginTop: 8 }}>
                <HexColorPicker
                  color={selectedRoom.floorColor}
                  onChange={(c) => updateRoomColor(selectedRoom.id, 'floorColor', c)}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['width', 'height'].map((dim) => (
              <div key={dim}>
                <label style={fieldLabel}>
                  {dim === 'width' ? 'Width (m)' : 'Depth (m)'}
                </label>
                <input
                  type="number"
                  value={selectedRoom[dim]}
                  min={2}
                  max={30}
                  onChange={(e) =>
                    updateRoom(selectedRoom.id, { [dim]: parseFloat(e.target.value) || 2 })
                  }
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <button
            onClick={() => removeRoom(selectedRoom.id)}
            style={{
              padding: '9px',
              background: 'transparent',
              border: `1px solid ${color.danger}`,
              borderRadius: radius.pill,
              color: color.danger,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            Delete room
          </button>
        </div>
      )}

      {!selectedRoom && (
        <div style={{ fontSize: 12, color: color.muted, textAlign: 'center', marginTop: 4 }}>
          Click a room to edit it
        </div>
      )}
    </div>
  )
}
