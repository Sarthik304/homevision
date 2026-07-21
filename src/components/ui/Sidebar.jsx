import { HexColorPicker } from 'react-colorful'
import { useState } from 'react'
import useHouseStore from '../../store/useHouseStore'

// Sidebar shows room controls on the right side of the screen.
// When a room is selected, you can change its wall color, floor color,
// rename it, or delete it.

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

  const [colorTarget, setColorTarget] = useState(null) // 'wall' or 'floor'

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)

  return (
    <div
      style={{
        width: 260,
        height: '100%',
        background: '#1e1e2e',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        gap: '16px',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Logo */}
      <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa', letterSpacing: 1 }}>
        🏠 HomeVision
      </div>

      {/* Room list */}
      <div>
        <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8 }}>
          Rooms
        </div>
        {rooms.map((room) => (
          <div
            key={room.id}
            onClick={() => {
              selectRoom(room.id)
              setColorTarget(null)
            }}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              marginBottom: 4,
              cursor: 'pointer',
              background: room.id === selectedRoomId ? '#2563eb' : '#2a2a3e',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: room.wallColor,
                border: '1px solid rgba(255,255,255,0.2)',
                flexShrink: 0,
              }}
            />
            {room.name}
          </div>
        ))}

        <button
          onClick={addRoom}
          style={{
            width: '100%',
            padding: '8px',
            marginTop: 8,
            background: '#2a2a3e',
            border: '1px dashed #444',
            borderRadius: 8,
            color: '#aaa',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          + Add room
        </button>
      </div>

      {/* Selected room controls */}
      {selectedRoom && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{
              height: 1,
              background: '#333',
            }}
          />

          <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>
            Edit: {selectedRoom.name}
          </div>

          {/* Room name */}
          <div>
            <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
              Room name
            </label>
            <input
              value={selectedRoom.name}
              onChange={(e) => updateRoom(selectedRoom.id, { name: e.target.value })}
              style={{
                width: '100%',
                padding: '6px 10px',
                background: '#2a2a3e',
                border: '1px solid #444',
                borderRadius: 6,
                color: '#fff',
                fontSize: 13,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Wall color */}
          <div>
            <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
              Wall colour
            </label>
            <div
              onClick={() => setColorTarget(colorTarget === 'wall' ? null : 'wall')}
              style={{
                width: '100%',
                height: 36,
                borderRadius: 6,
                background: selectedRoom.wallColor,
                cursor: 'pointer',
                border: colorTarget === 'wall' ? '2px solid #60a5fa' : '1px solid #444',
              }}
            />
            {colorTarget === 'wall' && (
              <div style={{ marginTop: 8 }}>
                <HexColorPicker
                  color={selectedRoom.wallColor}
                  onChange={(color) => updateRoomColor(selectedRoom.id, 'wallColor', color)}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          {/* Floor color */}
          <div>
            <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
              Floor colour
            </label>
            <div
              onClick={() => setColorTarget(colorTarget === 'floor' ? null : 'floor')}
              style={{
                width: '100%',
                height: 36,
                borderRadius: 6,
                background: selectedRoom.floorColor,
                cursor: 'pointer',
                border: colorTarget === 'floor' ? '2px solid #60a5fa' : '1px solid #444',
              }}
            />
            {colorTarget === 'floor' && (
              <div style={{ marginTop: 8 }}>
                <HexColorPicker
                  color={selectedRoom.floorColor}
                  onChange={(color) => updateRoomColor(selectedRoom.id, 'floorColor', color)}
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          {/* Dimensions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {['width', 'height'].map((dim) => (
              <div key={dim}>
                <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
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
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    background: '#2a2a3e',
                    border: '1px solid #444',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 13,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Delete room */}
          <button
            onClick={() => removeRoom(selectedRoom.id)}
            style={{
              padding: '8px',
              background: 'transparent',
              border: '1px solid #ef4444',
              borderRadius: 8,
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: 13,
              marginTop: 4,
            }}
          >
            Delete room
          </button>
        </div>
      )}

      {!selectedRoom && (
        <div style={{ fontSize: 12, color: '#555', textAlign: 'center', marginTop: 8 }}>
          Click a room to edit it
        </div>
      )}
    </div>
  )
}
