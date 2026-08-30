import { HexColorPicker } from 'react-colorful'
import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import useHouseStore from '../../store/useHouseStore'
import { getColors, radius } from '../../theme'
import { MIN_ROOM_SIZE } from '../../constants/floorPlan'
import { getWallKeys, MIN_NOTCH } from '../../constants/lshape'
import { FURNITURE_PRESETS } from '../../constants/furniture'
import { formatLength } from '../../utils/units'
import DimensionInput from './DimensionInput'
import useIsMobile from '../../hooks/useIsMobile'

const getSectionHeader = (color) => ({
  fontSize: 11,
  fontWeight: 700,
  color: color.muted,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
})

const getFieldLabel = (color) => ({
  fontSize: 12,
  color: color.muted,
  display: 'block',
  marginBottom: 6,
})

const getInputStyle = (color) => ({
  width: '100%',
  padding: '8px 10px',
  background: color.bg,
  border: `1px solid ${color.borderInput}`,
  borderRadius: radius.sm,
  color: color.text,
  fontSize: 13,
  boxSizing: 'border-box',
})

const getSecondaryButton = (color) => ({
  width: '100%',
  padding: '9px',
  background: color.bg,
  border: `1px solid ${color.text}`,
  borderRadius: radius.pill,
  color: color.text,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
})

const WALL_LABELS = {
  top: 'Top',
  bottom: 'Bottom',
  left: 'Left',
  right: 'Right',
  notchV: 'Notch (side)',
  notchH: 'Notch (top)',
}

function WallToggles({ room, toggleWall, color }) {
  const fieldLabel = getFieldLabel(color)
  const wallKeys = getWallKeys(room)
  return (
    <div>
      <label style={fieldLabel}>Walls</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {wallKeys.map((key) => {
          const present = room.walls[key]
          return (
            <button
              key={key}
              className="pixel-btn"
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

function getBoundaryWallColor(room, key) {
  return (room.wallColors ?? {})[key] ?? room.wallColor
}

function WallColorSwatches({ room, availableWalls, updateWallColor, colorTarget, setColorTarget, color }) {
  const fieldLabel = getFieldLabel(color)

  if (availableWalls.length === 0) return null

  return (
    <div>
      <label style={fieldLabel}>Per-wall colour</label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {availableWalls.map((key) => {
          const target = `boundary:${key}`
          const isOpen = colorTarget === target
          return (
            <div key={key}>
              <div
                onClick={() => setColorTarget(isOpen ? null : target)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 8px',
                  borderRadius: radius.sm,
                  border: isOpen ? `2px solid ${color.brand}` : `1px solid ${color.border}`,
                  cursor: 'pointer',
                  fontSize: 11,
                  color: color.text,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    background: getBoundaryWallColor(room, key),
                    border: `1px solid ${color.border}`,
                    flexShrink: 0,
                  }}
                />
                {WALL_LABELS[key]}
              </div>
              {isOpen && (
                <div style={{ marginTop: 8 }}>
                  <HexColorPicker
                    color={getBoundaryWallColor(room, key)}
                    onChange={(c) => updateWallColor(room.id, key, c)}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OpeningItemRow({ item, label, onUpdate, onRemove, minWidth, minHeight, showPosition, color, unit, removeLabel }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontSize: 12,
        background: color.surface,
        borderRadius: radius.sm,
        padding: '6px 8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {label != null && <span style={{ flex: 1, color: color.text }}>{label}</span>}
        <span style={{ color: color.muted, fontSize: 11 }}>W</span>
        <DimensionInput
          valueMeters={item.width}
          unit={unit}
          min={minWidth}
          onCommit={(meters) => onUpdate(item.id, { width: meters })}
          style={{ width: 48, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm, background: color.bg, color: color.text, flex: label == null ? 1 : undefined }}
        />
        {minHeight != null && (
          <>
            <span style={{ color: color.muted, fontSize: 11 }}>H</span>
            <DimensionInput
              valueMeters={item.height}
              unit={unit}
              min={minHeight}
              onCommit={(meters) => onUpdate(item.id, { height: meters })}
              style={{ width: 48, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm, background: color.bg, color: color.text }}
            />
          </>
        )}
        <span style={{ color: color.muted }}>{unit}</span>
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
          aria-label={removeLabel}
        >
          ×
        </button>
      </div>

      {showPosition && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: color.muted, fontSize: 10 }}>Start</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={item.offset}
            onChange={(e) => onUpdate(item.id, { offset: parseFloat(e.target.value) })}
            style={{ flex: 1, accentColor: color.brand }}
          />
          <span style={{ color: color.muted, fontSize: 10 }}>End</span>
        </div>
      )}
    </div>
  )
}

function OpeningList({ title, items, availableWalls, onAdd, onUpdate, onRemove, wallChoice, setWallChoice, minWidth, minHeight, showPosition, color, unit }) {
  const fieldLabel = getFieldLabel(color)
  const inputStyle = getInputStyle(color)

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
            className="pixel-btn"
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
            <OpeningItemRow
              key={item.id}
              item={item}
              label={WALL_LABELS[item.wall]}
              onUpdate={onUpdate}
              onRemove={onRemove}
              minWidth={minWidth}
              minHeight={minHeight}
              showPosition={showPosition}
              color={color}
              unit={unit}
              removeLabel={`Remove ${title.toLowerCase()}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InteriorWallCard({ room, wall, actions, colorTarget, setColorTarget, color, unit }) {
  const fieldLabel = getFieldLabel(color)
  const length = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1)
  const colorTargetKey = `interior:${wall.id}`
  const isColorOpen = colorTarget === colorTargetKey
  const wallColorValue = wall.color ?? room.wallColor

  const addButtonStyle = {
    flex: 1,
    padding: '6px 0',
    background: color.bg,
    border: `1px solid ${color.border}`,
    borderRadius: radius.sm,
    color: color.text,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        background: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: radius.sm,
        padding: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ flex: 1, fontSize: 12, color: color.text }}>Wall · {formatLength(length, unit)}</span>
        <div
          onClick={() => setColorTarget(isColorOpen ? null : colorTargetKey)}
          title="Wall colour"
          style={{
            width: 18,
            height: 18,
            borderRadius: radius.sm,
            background: wallColorValue,
            border: isColorOpen ? `2px solid ${color.brand}` : `1px solid ${color.border}`,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
        <span style={{ color: color.muted, fontSize: 11 }}>Thickness</span>
        <DimensionInput
          valueMeters={wall.thickness}
          unit={unit}
          min={0.05}
          max={0.5}
          step={0.01}
          onCommit={(meters) => actions.updateInteriorWall(room.id, wall.id, { thickness: meters })}
          style={{ width: 52, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm, background: color.surface, color: color.text }}
        />
        <button
          onClick={() => actions.removeInteriorWall(room.id, wall.id)}
          style={{ background: 'transparent', border: 'none', color: color.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
          aria-label="Remove interior wall"
        >
          ×
        </button>
      </div>

      {isColorOpen && (
        <HexColorPicker
          color={wallColorValue}
          onChange={(c) => actions.updateInteriorWall(room.id, wall.id, { color: c })}
          style={{ width: '100%' }}
        />
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button className="pixel-btn" onClick={() => actions.addInteriorDoor(room.id, wall.id)} style={addButtonStyle}>
          + Add door
        </button>
        <button className="pixel-btn" onClick={() => actions.addInteriorWindow(room.id, wall.id)} style={addButtonStyle}>
          + Add window
        </button>
      </div>

      {wall.doors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ ...fieldLabel, marginBottom: 0 }}>Doors</label>
          {wall.doors.map((door) => (
            <OpeningItemRow
              key={door.id}
              item={door}
              label={null}
              minWidth={0.3}
              showPosition
              color={color}
              unit={unit}
              removeLabel="Remove door"
              onUpdate={(id, updates) => actions.updateInteriorDoor(room.id, wall.id, id, updates)}
              onRemove={(id) => actions.removeInteriorDoor(room.id, wall.id, id)}
            />
          ))}
        </div>
      )}

      {wall.windows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ ...fieldLabel, marginBottom: 0 }}>Windows</label>
          {wall.windows.map((win) => (
            <OpeningItemRow
              key={win.id}
              item={win}
              label={null}
              minWidth={0.2}
              minHeight={0.2}
              showPosition
              color={color}
              unit={unit}
              removeLabel="Remove window"
              onUpdate={(id, updates) => actions.updateInteriorWindow(room.id, wall.id, id, updates)}
              onRemove={(id) => actions.removeInteriorWindow(room.id, wall.id, id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FurnitureRow({ item, onRemove, color }) {
  return (
    <div
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
      <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }} />
      <span style={{ flex: 1, color: color.text }}>{item.label}</span>
      <button
        onClick={() => onRemove(item.id)}
        style={{ background: 'transparent', border: 'none', color: color.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
        aria-label={`Remove ${item.label}`}
      >
        ×
      </button>
    </div>
  )
}

// state selector for useShallow
const selectSidebarState = (s) => ({
  rooms: s.rooms,
  selectedRoomId: s.selectedRoomId,
  selectRoom: s.selectRoom,
  selectedBoundaryWallKey: s.selectedBoundaryWallKey,
  selectedInteriorWallId: s.selectedInteriorWallId,
  updateRoomColor: s.updateRoomColor,
  updateRoom: s.updateRoom,
  resetQuadShape: s.resetQuadShape,
  updateWallColor: s.updateWallColor,
  addRoom: s.addRoom,
  addFloor: s.addFloor,
  removeRoom: s.removeRoom,
  toggleWall: s.toggleWall,
  addDoor: s.addDoor,
  updateDoor: s.updateDoor,
  removeDoor: s.removeDoor,
  addWindow: s.addWindow,
  updateWindow: s.updateWindow,
  removeWindow: s.removeWindow,
  addInteriorWall: s.addInteriorWall,
  updateInteriorWall: s.updateInteriorWall,
  removeInteriorWall: s.removeInteriorWall,
  addInteriorDoor: s.addInteriorDoor,
  updateInteriorDoor: s.updateInteriorDoor,
  removeInteriorDoor: s.removeInteriorDoor,
  addInteriorWindow: s.addInteriorWindow,
  updateInteriorWindow: s.updateInteriorWindow,
  removeInteriorWindow: s.removeInteriorWindow,
  addFurniture: s.addFurniture,
  removeFurniture: s.removeFurniture,
  darkMode: s.darkMode,
  unit: s.unit,
})

export default function Sidebar() {
  const {
    rooms,
    selectedRoomId,
    selectRoom,
    selectedBoundaryWallKey,
    selectedInteriorWallId,
    updateRoomColor,
    updateRoom,
    resetQuadShape,
    updateWallColor,
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
    addInteriorWall,
    updateInteriorWall,
    removeInteriorWall,
    addInteriorDoor,
    updateInteriorDoor,
    removeInteriorDoor,
    addInteriorWindow,
    updateInteriorWindow,
    removeInteriorWindow,
    addFurniture,
    removeFurniture,
    darkMode,
    unit,
  } = useHouseStore(useShallow(selectSidebarState))

  const interiorWallActions = {
    updateInteriorWall,
    removeInteriorWall,
    addInteriorDoor,
    updateInteriorDoor,
    removeInteriorDoor,
    addInteriorWindow,
    updateInteriorWindow,
    removeInteriorWindow,
  }

  const color = getColors(darkMode)
  const sectionHeader = getSectionHeader(color)
  const fieldLabel = getFieldLabel(color)
  const inputStyle = getInputStyle(color)
  const secondaryButton = getSecondaryButton(color)

  const [colorTarget, setColorTarget] = useState(null)
  const [hoveredRoomId, setHoveredRoomId] = useState(null)
  const [doorWallChoice, setDoorWallChoice] = useState('top')
  const [windowWallChoice, setWindowWallChoice] = useState('top')
  const [newRoomShape, setNewRoomShape] = useState('rect')
  const isMobile = useIsMobile()
  const [mobileOpen, setMobileOpen] = useState(false)

  // opens the drawer automatically when a room gets selected on the canvas
  useEffect(() => {
    if (isMobile && selectedRoomId) setMobileOpen(true)
  }, [isMobile, selectedRoomId])

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId)
  const availableWalls = selectedRoom ? getWallKeys(selectedRoom).filter((key) => selectedRoom.walls[key]) : []
  const doorWall = availableWalls.includes(doorWallChoice) ? doorWallChoice : availableWalls[0]
  const windowWall = availableWalls.includes(windowWallChoice) ? windowWallChoice : availableWalls[0]

  useEffect(() => {
    if (selectedBoundaryWallKey) setColorTarget(`boundary:${selectedBoundaryWallKey}`)
  }, [selectedBoundaryWallKey])

  useEffect(() => {
    if (selectedInteriorWallId) setColorTarget(`interior:${selectedInteriorWallId}`)
  }, [selectedInteriorWallId])

  if (isMobile && !mobileOpen) {
    return (
      <button
        className="pixel-btn"
        onClick={() => setMobileOpen(true)}
        aria-label="Open room properties"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: `1.5px solid ${color.text}`,
          background: color.brand,
          color: '#fff',
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
          zIndex: 30,
        }}
      >
        ⚙
      </button>
    )
  }

  return (
    <>
      {isMobile && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 30 }}
        />
      )}
      <div
      style={{
        width: isMobile ? '100%' : 280,
        height: isMobile ? 'min(75vh, 560px)' : '100%',
        maxHeight: isMobile ? '75vh' : undefined,
        position: isMobile ? 'fixed' : 'static',
        left: isMobile ? 0 : undefined,
        right: isMobile ? 0 : undefined,
        bottom: isMobile ? 0 : undefined,
        borderRadius: isMobile ? '16px 16px 0 0' : 0,
        zIndex: isMobile ? 31 : undefined,
        background: color.bg,
        borderLeft: isMobile ? 'none' : `1px solid ${color.border}`,
        borderTop: isMobile ? `1px solid ${color.border}` : 'none',
        color: color.text,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        gap: 20,
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {isMobile && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0 -4px', cursor: 'pointer' }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: color.border }} />
        </div>
      )}

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

        <div style={{ marginTop: 12 }}>
          <label style={{ ...fieldLabel, marginBottom: 6 }}>Room shape</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[
              { key: 'rect', label: 'Rectangle' },
              { key: 'L', label: 'L shape' },
              { key: 'quad', label: 'Quad' },
            ].map(({ key, label }) => {
              const active = newRoomShape === key
              return (
                <button
                  key={key}
                  className="pixel-btn"
                  onClick={() => setNewRoomShape(key)}
                  style={{
                    padding: '7px 0',
                    borderRadius: radius.sm,
                    border: `1px solid ${active ? color.brand : color.border}`,
                    background: active ? color.brandTint : color.bg,
                    color: active ? color.brand : color.muted,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <button className="pixel-btn" onClick={() => addRoom(newRoomShape)} style={secondaryButton}>
            + Add room
          </button>
          <button className="pixel-btn" onClick={addFloor} style={secondaryButton}>
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
                  {dim === 'width' ? `Width (${unit})` : `Depth (${unit})`}
                </label>
                <DimensionInput
                  valueMeters={selectedRoom[dim]}
                  unit={unit}
                  min={MIN_ROOM_SIZE}
                  onCommit={(meters) => updateRoom(selectedRoom.id, { [dim]: meters })}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>

          {selectedRoom.shape === 'L' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['notchWidth', 'notchHeight'].map((dim) => {
                const cap = (dim === 'notchWidth' ? selectedRoom.width : selectedRoom.height) - MIN_ROOM_SIZE
                return (
                  <div key={dim}>
                    <label style={fieldLabel}>
                      {dim === 'notchWidth' ? `Notch width (${unit})` : `Notch depth (${unit})`}
                    </label>
                    <DimensionInput
                      valueMeters={selectedRoom[dim]}
                      unit={unit}
                      min={MIN_NOTCH}
                      max={cap}
                      onCommit={(meters) => updateRoom(selectedRoom.id, { [dim]: meters })}
                      style={inputStyle}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {selectedRoom.shape === 'quad' && (
            <div>
              <button
                className="pixel-btn"
                onClick={() => resetQuadShape(selectedRoom.id)}
                style={secondaryButton}
              >
                Reset to rectangle
              </button>
              <div style={{ fontSize: 11, color: color.muted, marginTop: 6 }}>
                Drag a corner in the 2D view to reshape this room — it snaps to an edge's midpoint
                or the center, handy for a rhombus, kite, trapezoid, or parallelogram.
              </div>
            </div>
          )}

          <div>
            <label style={fieldLabel}>Rotation (°)</label>
            <input
              type="number"
              value={selectedRoom.rotation ?? 0}
              step={45}
              onChange={(e) => {
                const raw = parseFloat(e.target.value)
                const normalized = ((raw % 360) + 360) % 360
                updateRoom(selectedRoom.id, { rotation: Number.isFinite(raw) ? normalized : 0 })
              }}
              style={inputStyle}
            />
            <div style={{ fontSize: 11, color: color.muted, marginTop: 6 }}>
              Or drag the handle above a selected room in the 2D view — it clicks into 45° steps.
            </div>
          </div>

          <div style={{ height: 1, background: color.border }} />

          <WallToggles room={selectedRoom} toggleWall={toggleWall} color={color} />

          <WallColorSwatches
            room={selectedRoom}
            availableWalls={availableWalls}
            updateWallColor={updateWallColor}
            colorTarget={colorTarget}
            setColorTarget={setColorTarget}
            color={color}
          />

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
            showPosition
            color={color}
            unit={unit}
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
            color={color}
            unit={unit}
          />

          <div style={{ height: 1, background: color.border }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={sectionHeader}>Interior walls</div>

            {(selectedRoom.interiorWalls ?? []).map((wall) => (
              <InteriorWallCard
                key={wall.id}
                room={selectedRoom}
                wall={wall}
                actions={interiorWallActions}
                colorTarget={colorTarget}
                setColorTarget={setColorTarget}
                color={color}
                unit={unit}
              />
            ))}

            <button className="pixel-btn" onClick={() => addInteriorWall(selectedRoom.id)} style={secondaryButton}>
              + Add interior wall
            </button>

            <div style={{ fontSize: 11, color: color.muted }}>
              Drag a wall or its endpoints in the 2D view to position and resize it.
            </div>
          </div>

          <div style={{ height: 1, background: color.border }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={sectionHeader}>Furniture</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {FURNITURE_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  className="pixel-btn"
                  onClick={() => addFurniture(selectedRoom.id, preset)}
                  style={{
                    padding: '7px 0',
                    borderRadius: radius.sm,
                    border: `1px solid ${color.border}`,
                    background: color.bg,
                    color: color.text,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            {(selectedRoom.furniture ?? []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedRoom.furniture.map((item) => (
                  <FurnitureRow
                    key={item.id}
                    item={item}
                    onRemove={(id) => removeFurniture(selectedRoom.id, id)}
                    color={color}
                  />
                ))}
              </div>
            )}

            <div style={{ fontSize: 11, color: color.muted }}>
              Drag furniture in the 2D view to position it.
            </div>
          </div>

          <button
            className="pixel-btn"
            onClick={() => {
              if (window.confirm(`Delete "${selectedRoom.name}"? This can't be undone.`)) {
                removeRoom(selectedRoom.id)
              }
            }}
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
    </>
  )
}
