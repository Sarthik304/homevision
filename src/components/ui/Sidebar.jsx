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

const secondaryButton = {
  width: '100%',
  padding: '9px',
  background: color.bg,
  border: `1px solid ${color.text}`,
  borderRadius: radius.pill,
  color: color.text,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
}

const WALL_LABELS = { top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right' }
const WALL_KEYS = ['top', 'bottom', 'left', 'right']

function WallToggles({ room, toggleWall }) {
  return (
    <div>
      <label style={fieldLabel}>Walls</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {WALL_KEYS.map((key) => {
          const present = room.walls[key]
          return (
            <button
              key={key}
              onClick={() => toggleWall(room.id, key)}
              style={{
                padding: '7px 0',
                borderRadius: radius.sm,
                border: `1px solid ${present ? color.brand : color.border}`,
                background: present ? color.brandTint : color.bg,
                color: present ? color.brand : color.muted,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: present ? 700 : 500,
              }}
            >
              {WALL_LABELS[key]} wall {present ? '✓' : ''}
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: color.muted, marginTop: 6 }}>
        Toggle a side to add or remove a wall wherever the floor is present.
      </div>
    </div>
  )
}

function OpeningList({ title, items, availableWalls, onAdd, onUpdate, onRemove, wallChoice, setWallChoice, minWidth, minHeight }) {
  return (
    <div>
      <label style={fieldLabel}>{title}</label>

      {availableWalls.length > 0 ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <select
            value={wallChoice}
            onChange={(e) => setWallChoice(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          >
            {availableWalls.map((key) => (
              <option key={key} value={key}>
                {WALL_LABELS[key]} wall
              </option>
            ))}
          </select>
          <button
            onClick={() => onAdd(wallChoice)}
            style={{
              padding: '0 12px',
              background: color.brand,
              border: `1px solid ${color.brand}`,
              borderRadius: radius.sm,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            + Add
          </button>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: color.muted }}>No walls to place one on.</div>
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                background: color.surface,
                borderRadius: radius.sm,
                padding: '6px 8px',
              }}
            >
              <span style={{ flex: 1, color: color.text }}>{WALL_LABELS[item.wall]}</span>
              <span style={{ color: color.muted, fontSize: 11 }}>W</span>
              <input
                type="number"
                value={item.width}
                min={minWidth}
                step={0.1}
                onChange={(e) => onUpdate(item.id, { width: parseFloat(e.target.value) || minWidth })}
                style={{ width: 48, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm }}
              />
              {minHeight != null && (
                <>
                  <span style={{ color: color.muted, fontSize: 11 }}>H</span>
                  <input
                    type="number"
                    value={item.height}
                    min={minHeight}
                    step={0.1}
                    onChange={(e) => onUpdate(item.id, { height: parseFloat(e.target.value) || minHeight })}
                    style={{ width: 48, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm }}
                  />
                </>
              )}
              <span style={{ color: color.muted }}>m</span>
              <button
                onClick={() => onRemove(item.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: color.danger,
                  cursor: 'pointer',
                  fontSize: 14,
                  lineHeight: 1,
                  padding: '2px 4px',
                }}
                aria-label={`Remove ${title.toLowerCase()}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const {
    rooms,
    selectedRoomId,
    selectRoom,
    updateRoomColor,
    updateRoom,
    addRoom,
    addFloor,
    removeRoom,
    toggleWall,
    addDoor,
    updateDoor,
    removeDoor,
    addWindow,
    updateWindow,
    removeWindow,
  } = useHouseStore()

  const [colorTarget, setColorTarget] = useState(null)
  const [hoveredRoomId, setHoveredRoomId] = useState(null)
  const [doorWallChoice, setDoorWallChoice] = useState('top')
  const [windowWallChoice, setWindowWallChoice] = useState('top')

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)
  const availableWalls = selectedRoom ? WALL_KEYS.filter((key) => selectedRoom.walls[key]) : []
  const doorWall = availableWalls.includes(doorWallChoice) ? doorWallChoice : availableWalls[0]
  const windowWall = availableWalls.includes(windowWallChoice) ? windowWallChoice : availableWalls[0]

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          <button onClick={addRoom} style={secondaryButton}>
            + Add room
          </button>
          <button onClick={addFloor} style={secondaryButton}>
            + Add floor (no walls)
          </button>
        </div>
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
                  min={0.1}
                  step={0.1}
                  onChange={(e) =>
                    updateRoom(selectedRoom.id, { [dim]: parseFloat(e.target.value) || 0.1 })
                  }
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: color.border }} />

          <WallToggles room={selectedRoom} toggleWall={toggleWall} />

          <OpeningList
            title="Doorways"
            items={selectedRoom.doors}
            availableWalls={availableWalls}
            onAdd={(wall) => addDoor(selectedRoom.id, wall)}
            onUpdate={(id, updates) => updateDoor(selectedRoom.id, id, updates)}
            onRemove={(id) => removeDoor(selectedRoom.id, id)}
            wallChoice={doorWall}
            setWallChoice={setDoorWallChoice}
            minWidth={0.3}
          />

          <OpeningList
            title="Windows"
            items={selectedRoom.windows}
            availableWalls={availableWalls}
            onAdd={(wall) => addWindow(selectedRoom.id, wall)}
            onUpdate={(id, updates) => updateWindow(selectedRoom.id, id, updates)}
            onRemove={(id) => removeWindow(selectedRoom.id, id)}
            wallChoice={windowWall}
            setWallChoice={setWindowWallChoice}
            minWidth={0.2}
            minHeight={0.2}
          />

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
