import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { HexColorPicker } from 'react-colorful'
import { useShallow } from 'zustand/react/shallow'
import Room3D from './Room3D'
import useHouseStore from '../../store/useHouseStore'
import { getColors, radius } from '../../theme'
import { eventClientXY } from '../../utils/pointerPosition'
import DimensionInput from '../ui/DimensionInput'
import { INTERIOR_WALL_THICKNESS, MAX_WALL_THICKNESS, MIN_WALL_THICKNESS, WALL_THICKNESS } from '../../utils/wallGeometry'
import { FURNITURE_PRESETS } from '../../constants/furniture'

const WALL_LABELS = { top: 'Top wall', bottom: 'Bottom wall', left: 'Left wall', right: 'Right wall' }
const POPUP_WIDTH = 200
const POPUP_HEIGHT = 560
const FURNITURE_POPUP_WIDTH = 180
const FURNITURE_POPUP_HEIGHT = 210
// hoisted so Canvas's `camera` prop keeps a stable reference across renders
const INITIAL_CAMERA = { position: [20, 20, 20], fov: 50, near: 0.1, far: 1000 }
// debounces Canvas's resize-triggered reconnect, which was dropping OrbitControls mid-setup
const RESIZE_OPTIONS = { debounce: { resize: 100 } }

function getWallColor(room, kind, key) {
  if (!room) return '#ffffff'
  if (kind === 'boundary') return (room.wallColors ?? {})[key] ?? room.wallColor
  const wall = (room.interiorWalls ?? []).find((w) => w.id === key)
  return wall?.color ?? room.wallColor
}

function PipetteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m2 22 1-1h3l9-9" />
      <path d="M3 21v-3l9-9" />
      <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z" />
    </svg>
  )
}

// hidden file input behind a normal button, so "upload" looks and behaves like any other action
function UploadPictureButton({ onFile, label, style }) {
  const inputRef = useRef(null)

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // so choosing the same file again still fires onChange
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onFile(reader.result)
    reader.readAsDataURL(file)
  }

  return (
    <>
      <button type="button" className="pixel-btn" onClick={() => inputRef.current?.click()} style={style}>
        {label}
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
    </>
  )
}

// one uploaded picture already hanging on the wall the popup is currently open for
function PictureItemRow({ item, onUpdate, onRemove, color, unit }) {
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
        <img
          src={item.src}
          alt=""
          style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: radius.sm, border: `1px solid ${color.border}`, flexShrink: 0 }}
        />
        <span style={{ color: color.muted, fontSize: 11 }}>W</span>
        <DimensionInput
          valueMeters={item.width}
          unit={unit}
          min={0.1}
          onCommit={(meters) => onUpdate(item.id, { width: meters })}
          style={{ width: 40, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm, background: color.bg, color: color.text }}
        />
        <span style={{ color: color.muted, fontSize: 11 }}>H</span>
        <DimensionInput
          valueMeters={item.height}
          unit={unit}
          min={0.1}
          onCommit={(meters) => onUpdate(item.id, { height: meters })}
          style={{ width: 40, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm, background: color.bg, color: color.text }}
        />
        <button
          onClick={() => onRemove(item.id)}
          aria-label="Remove picture"
          style={{ background: 'transparent', border: 'none', color: color.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: color.muted, fontSize: 11 }}>Off floor</span>
        <DimensionInput
          valueMeters={item.bottom}
          unit={unit}
          min={0}
          onCommit={(meters) => onUpdate(item.id, { bottom: meters })}
          style={{ width: 48, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm, background: color.bg, color: color.text }}
        />
        <span style={{ color: color.muted, fontSize: 10 }}>{unit}</span>
      </div>

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
    </div>
  )
}

// one door or window already cut into the wall the popup is currently open for; windows also
// get a height (`minHeight`), doors don't
function OpeningItemRow({ item, label, onUpdate, onRemove, minWidth, minHeight, color, unit }) {
  const inputStyle = { width: 44, padding: '4px 6px', fontSize: 12, border: `1px solid ${color.borderInput}`, borderRadius: radius.sm, background: color.bg, color: color.text }
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
        <span style={{ color: color.muted, fontSize: 11 }}>W</span>
        <DimensionInput
          valueMeters={item.width}
          unit={unit}
          min={minWidth}
          onCommit={(meters) => onUpdate(item.id, { width: meters })}
          style={inputStyle}
        />
        {minHeight != null && (
          <>
            <span style={{ color: color.muted, fontSize: 11 }}>H</span>
            <DimensionInput
              valueMeters={item.height}
              unit={unit}
              min={minHeight}
              onCommit={(meters) => onUpdate(item.id, { height: meters })}
              style={inputStyle}
            />
          </>
        )}
        <button
          onClick={() => onRemove(item.id)}
          aria-label={`Remove ${label}`}
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: color.danger, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px' }}
        >
          ×
        </button>
      </div>

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
    </div>
  )
}

// "Doors" / "Windows" header with a + Add button, then a row per opening on this wall
function OpeningSection({ title, label, items, onAdd, onUpdate, onRemove, minWidth, minHeight, color, unit }) {
  return (
    <>
      <div style={{ height: 1, background: color.border, margin: '10px 0' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: color.text }}>{title}</span>
        <button
          className="pixel-btn"
          onClick={onAdd}
          style={{
            padding: '4px 10px',
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
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => (
            <OpeningItemRow
              key={item.id}
              item={item}
              label={label}
              onUpdate={onUpdate}
              onRemove={onRemove}
              minWidth={minWidth}
              minHeight={minHeight}
              color={color}
              unit={unit}
            />
          ))}
        </div>
      )}
    </>
  )
}

// state selector for useShallow
const selectHouseViewerState = (s) => ({
  rooms: s.rooms,
  selectedRoomId: s.selectedRoomId,
  selectRoom: s.selectRoom,
  selectBoundaryWall: s.selectBoundaryWall,
  selectInteriorWall: s.selectInteriorWall,
  updateWallColor: s.updateWallColor,
  updateInteriorWall: s.updateInteriorWall,
  updateRoom: s.updateRoom,
  addFurniture: s.addFurniture,
  addPicture: s.addPicture,
  updatePicture: s.updatePicture,
  removePicture: s.removePicture,
  addInteriorPicture: s.addInteriorPicture,
  updateInteriorPicture: s.updateInteriorPicture,
  removeInteriorPicture: s.removeInteriorPicture,
  addDoor: s.addDoor,
  updateDoor: s.updateDoor,
  removeDoor: s.removeDoor,
  addWindow: s.addWindow,
  updateWindow: s.updateWindow,
  removeWindow: s.removeWindow,
  addInteriorDoor: s.addInteriorDoor,
  updateInteriorDoor: s.updateInteriorDoor,
  removeInteriorDoor: s.removeInteriorDoor,
  addInteriorWindow: s.addInteriorWindow,
  updateInteriorWindow: s.updateInteriorWindow,
  removeInteriorWindow: s.removeInteriorWindow,
  darkMode: s.darkMode,
  unit: s.unit,
})

export default function HouseViewer() {
  const {
    rooms,
    selectedRoomId,
    selectRoom,
    selectBoundaryWall,
    selectInteriorWall,
    updateWallColor,
    updateInteriorWall,
    updateRoom,
    addFurniture,
    addPicture,
    updatePicture,
    removePicture,
    addInteriorPicture,
    updateInteriorPicture,
    removeInteriorPicture,
    addDoor,
    updateDoor,
    removeDoor,
    addWindow,
    updateWindow,
    removeWindow,
    addInteriorDoor,
    updateInteriorDoor,
    removeInteriorDoor,
    addInteriorWindow,
    updateInteriorWindow,
    removeInteriorWindow,
    darkMode,
    unit,
  } = useHouseStore(useShallow(selectHouseViewerState))
  const color = getColors(darkMode)
  const containerRef = useRef(null)
  const [colorPicker, setColorPicker] = useState(null) // { roomId, kind, key, x, y }
  const [furniturePicker, setFurniturePicker] = useState(null) // { roomId, atX, atY, x, y } — atX/atY are room-local meters, x/y are screen position
  const [pickMode, setPickMode] = useState(false) // eyedropper: sampling colour from another wall
  const [draggingFurniture, setDraggingFurniture] = useState(false) // disables orbit while dragging
  const [draggingPicture, setDraggingPicture] = useState(false) // disables orbit while resizing a picture

  const handleSelectWall = (kind, key) => {
    if (kind === 'boundary') selectBoundaryWall(key)
    else selectInteriorWall(key)
  }

  const closeColorPicker = () => {
    setColorPicker(null)
    setPickMode(false)
  }

  const handleWallDoubleClick = (roomId, kind, key, nativeEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const { clientX, clientY } = eventClientXY(nativeEvent)
    const rawX = clientX - rect.left
    const rawY = clientY - rect.top
    setColorPicker({
      roomId,
      kind,
      key,
      x: Math.min(Math.max(8, rawX), rect.width - POPUP_WIDTH - 8),
      y: Math.min(Math.max(8, rawY), rect.height - POPUP_HEIGHT - 8),
    })
  }

  // the wall popup can be dragged by its header, so it can be moved off the door/window being adjusted
  const popupRef = useRef(null)
  const popupDragRef = useRef(null) // { startX, startY, originX, originY } while dragging

  const handlePopupDragStart = (e) => {
    if (e.target.closest('button')) return
    popupDragRef.current = { startX: e.clientX, startY: e.clientY, originX: colorPicker.x, originY: colorPicker.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handlePopupDragMove = (e) => {
    const drag = popupDragRef.current
    const rect = containerRef.current?.getBoundingClientRect()
    if (!drag || !rect) return
    const popupHeight = popupRef.current?.offsetHeight ?? POPUP_HEIGHT
    const x = drag.originX + e.clientX - drag.startX
    const y = drag.originY + e.clientY - drag.startY
    setColorPicker((p) =>
      p && {
        ...p,
        x: Math.min(Math.max(8, x), Math.max(8, rect.width - POPUP_WIDTH - 8)),
        y: Math.min(Math.max(8, y), Math.max(8, rect.height - popupHeight - 8)),
      }
    )
  }

  const handlePopupDragEnd = () => {
    popupDragRef.current = null
  }

  const closeFurniturePicker = () => setFurniturePicker(null)

  // double-clicking the floor itself (not a wall/furniture item) offers to drop a furniture
  // preset right there, the same way double-clicking a wall offers to edit it
  const handleFloorDoubleClick = (roomId, atX, atY, nativeEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const { clientX, clientY } = eventClientXY(nativeEvent)
    const rawX = clientX - rect.left
    const rawY = clientY - rect.top
    setFurniturePicker({
      roomId,
      atX,
      atY,
      x: Math.min(Math.max(8, rawX), rect.width - FURNITURE_POPUP_WIDTH - 8),
      y: Math.min(Math.max(8, rawY), rect.height - FURNITURE_POPUP_HEIGHT - 8),
    })
  }

  const handleAddFurniture = (preset) => {
    if (!furniturePicker) return
    addFurniture(furniturePicker.roomId, preset, { x: furniturePicker.atX, y: furniturePicker.atY })
    closeFurniturePicker()
  }

  const handleDeselect = () => {
    if (pickMode) {
      setPickMode(false)
      return
    }
    selectRoom(null)
    closeColorPicker()
    closeFurniturePicker()
  }

  useEffect(() => {
    if (!pickMode) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPickMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pickMode])

  // recenter the house on the grid (rooms use absolute 2D coords)
  const houseOffset = (() => {
    if (rooms.length === 0) return [0, 0]
    const bounds = rooms.reduce(
      (acc, r) => ({
        minX: Math.min(acc.minX, r.x),
        maxX: Math.max(acc.maxX, r.x + r.width),
        minY: Math.min(acc.minY, r.y),
        maxY: Math.max(acc.maxY, r.y + r.height),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    )
    return [-(bounds.minX + bounds.maxX) / 2, -(bounds.minY + bounds.maxY) / 2]
  })()

  const activeRoom = colorPicker ? rooms.find((r) => r.id === colorPicker.roomId) : null
  const activeColor = activeRoom ? getWallColor(activeRoom, colorPicker.kind, colorPicker.key) : '#ffffff'
  const activeInteriorWall =
    activeRoom && colorPicker?.kind === 'interior'
      ? activeRoom.interiorWalls?.find((w) => w.id === colorPicker.key)
      : null
  const activeWallPictures = !activeRoom
    ? []
    : colorPicker.kind === 'boundary'
      ? (activeRoom.pictures ?? []).filter((p) => p.wall === colorPicker.key)
      : (activeInteriorWall?.pictures ?? [])
  // boundary doors/windows live on the room tagged with a `wall` key; an interior wall carries its own
  const activeWallDoors = !activeRoom
    ? []
    : colorPicker.kind === 'boundary'
      ? (activeRoom.doors ?? []).filter((d) => d.wall === colorPicker.key)
      : (activeInteriorWall?.doors ?? [])
  const activeWallWindows = !activeRoom
    ? []
    : colorPicker.kind === 'boundary'
      ? (activeRoom.windows ?? []).filter((w) => w.wall === colorPicker.key)
      : (activeInteriorWall?.windows ?? [])
  // boundary walls share one thickness per room (its corners miter to a single value); interior
  // walls each carry their own — see wallThickness/thickness comments in useHouseStore.js
  const activeThickness = !activeRoom
    ? WALL_THICKNESS
    : colorPicker.kind === 'boundary'
      ? (activeRoom.wallThickness ?? WALL_THICKNESS)
      : (activeInteriorWall?.thickness ?? INTERIOR_WALL_THICKNESS)

  const handleColorChange = (c) => {
    if (!colorPicker) return
    if (colorPicker.kind === 'boundary') {
      updateWallColor(colorPicker.roomId, colorPicker.key, c)
    } else {
      updateInteriorWall(colorPicker.roomId, colorPicker.key, { color: c })
    }
  }

  const handleThicknessChange = (meters) => {
    if (!colorPicker) return
    if (colorPicker.kind === 'boundary') {
      updateRoom(colorPicker.roomId, { wallThickness: meters })
    } else {
      updateInteriorWall(colorPicker.roomId, colorPicker.key, { thickness: meters })
    }
  }

  const handleWallColorPick = (roomId, kind, key) => {
    const sourceRoom = rooms.find((r) => r.id === roomId)
    if (!sourceRoom) return
    handleColorChange(getWallColor(sourceRoom, kind, key))
    setPickMode(false)
  }

  const handleUploadPicture = (src) => {
    if (!colorPicker) return
    if (colorPicker.kind === 'boundary') addPicture(colorPicker.roomId, colorPicker.key, src)
    else addInteriorPicture(colorPicker.roomId, colorPicker.key, src)
  }

  const handleUpdatePicture = (pictureId, updates) => {
    if (!colorPicker) return
    if (colorPicker.kind === 'boundary') updatePicture(colorPicker.roomId, pictureId, updates)
    else updateInteriorPicture(colorPicker.roomId, colorPicker.key, pictureId, updates)
  }

  const handleRemovePicture = (pictureId) => {
    if (!colorPicker) return
    if (colorPicker.kind === 'boundary') removePicture(colorPicker.roomId, pictureId)
    else removeInteriorPicture(colorPicker.roomId, colorPicker.key, pictureId)
  }

  const isBoundary = colorPicker?.kind === 'boundary'

  const handleAddDoor = () => {
    if (!colorPicker) return
    if (isBoundary) addDoor(colorPicker.roomId, colorPicker.key)
    else addInteriorDoor(colorPicker.roomId, colorPicker.key)
  }

  const handleUpdateDoor = (doorId, updates) => {
    if (!colorPicker) return
    if (isBoundary) updateDoor(colorPicker.roomId, doorId, updates)
    else updateInteriorDoor(colorPicker.roomId, colorPicker.key, doorId, updates)
  }

  const handleRemoveDoor = (doorId) => {
    if (!colorPicker) return
    if (isBoundary) removeDoor(colorPicker.roomId, doorId)
    else removeInteriorDoor(colorPicker.roomId, colorPicker.key, doorId)
  }

  const handleAddWindow = () => {
    if (!colorPicker) return
    if (isBoundary) addWindow(colorPicker.roomId, colorPicker.key)
    else addInteriorWindow(colorPicker.roomId, colorPicker.key)
  }

  const handleUpdateWindow = (windowId, updates) => {
    if (!colorPicker) return
    if (isBoundary) updateWindow(colorPicker.roomId, windowId, updates)
    else updateInteriorWindow(colorPicker.roomId, colorPicker.key, windowId, updates)
  }

  const handleRemoveWindow = (windowId) => {
    if (!colorPicker) return
    if (isBoundary) removeWindow(colorPicker.roomId, windowId)
    else removeInteriorWindow(colorPicker.roomId, colorPicker.key, windowId)
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', cursor: pickMode ? 'crosshair' : 'default' }}>
      <Canvas camera={INITIAL_CAMERA} shadows resize={RESIZE_OPTIONS}>
        <color attach="background" args={[color.workspace]} />

        {/* sky-to-ground ambient instead of a flat fill, so unlit surfaces still read as
            "up" vs "down" the way they do outdoors */}
        <hemisphereLight
          color={darkMode ? '#3a4a6b' : '#cfe3f7'}
          groundColor={darkMode ? '#15151a' : '#a89478'}
          intensity={darkMode ? 0.35 : 0.6}
        />

        {/* key light: a warm high-angle sun, the only shadow-caster */}
        <directionalLight
          position={[14, 22, 9]}
          intensity={darkMode ? 0.55 : 1.2}
          color={darkMode ? '#aebbff' : '#fff3e0'}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
          shadow-camera-near={1}
          shadow-camera-far={80}
          shadow-bias={-0.0003}
          shadow-normalBias={0.02}
          shadow-radius={3}
        />

        {/* fill light: cool and dim, no shadow — softens the key light's shadow side the way
            bounced sky light would, instead of leaving it flat black */}
        <directionalLight position={[-12, 10, -8]} intensity={darkMode ? 0.12 : 0.28} color={darkMode ? '#6d7fff' : '#dbe8ff'} />

        <Environment preset="apartment" environmentIntensity={darkMode ? 0.2 : 0.35} />

        <Grid
          args={[100, 100]}
          position={[0, -0.01, 0]}
          cellColor={color.gridCell}
          sectionColor={color.gridSection}
        />

        <group position={[houseOffset[0], 0, houseOffset[1]]}>
          {rooms.map((room) => (
            <Room3D
              key={room.id}
              room={room}
              rooms={rooms}
              isSelected={room.id === selectedRoomId}
              onClick={selectRoom}
              onSelectWall={handleSelectWall}
              onWallDoubleClick={handleWallDoubleClick}
              onFloorDoubleClick={handleFloorDoubleClick}
              pickMode={pickMode}
              onWallColorPick={handleWallColorPick}
              onFurnitureDragChange={setDraggingFurniture}
              onPictureDragChange={setDraggingPicture}
            />
          ))}
        </group>

        <mesh
          position={[0, -0.1, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={handleDeselect}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshStandardMaterial transparent opacity={0} />
        </mesh>

        <OrbitControls
          makeDefault
          enabled={!draggingFurniture && !draggingPicture}
          minDistance={5}
          maxDistance={100}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>

      {pickMode && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: '50%',
            transform: 'translateX(-50%)',
            background: color.bg,
            border: `1px solid ${color.border}`,
            borderRadius: radius.pill,
            padding: '6px 14px',
            fontSize: 12,
            color: color.text,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          Click a wall to sample its colour · Esc to cancel
        </div>
      )}

      {colorPicker && activeRoom && (
        <div
          ref={popupRef}
          className="pixel-shadow"
          style={{
            position: 'absolute',
            left: colorPicker.x,
            top: colorPicker.y,
            width: POPUP_WIDTH,
            maxHeight: '80vh',
            overflowY: 'auto',
            background: color.bg,
            border: `1.5px solid ${color.text}`,
            borderRadius: radius.md,
            '--pixel-shadow-color': color.text,
            padding: 10,
            zIndex: 10,
          }}
        >
          <div
            onPointerDown={handlePopupDragStart}
            onPointerMove={handlePopupDragMove}
            onPointerUp={handlePopupDragEnd}
            onPointerCancel={handlePopupDragEnd}
            title="Drag to move"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              gap: 6,
              cursor: 'move',
              touchAction: 'none',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: color.text, userSelect: 'none' }}>
              ⠿ {colorPicker.kind === 'boundary' ? WALL_LABELS[colorPicker.key] : 'Interior wall'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                className="pixel-btn"
                onClick={() => setPickMode((p) => !p)}
                aria-label="Pick colour from another wall"
                title="Pick colour from another wall"
                style={{
                  display: 'flex',
                  background: pickMode ? color.brandTint : 'transparent',
                  border: `1px solid ${pickMode ? color.brand : 'transparent'}`,
                  borderRadius: radius.sm,
                  color: pickMode ? color.brand : color.muted,
                  cursor: 'pointer',
                  padding: '3px 5px',
                }}
              >
                <PipetteIcon />
              </button>
              <button
                onClick={closeColorPicker}
                aria-label="Close colour picker"
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
          </div>
          <HexColorPicker color={activeColor} onChange={handleColorChange} style={{ width: '100%' }} />

          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, color: color.muted, display: 'block', marginBottom: 4 }}>
              Thickness ({unit})
            </label>
            <DimensionInput
              valueMeters={activeThickness}
              unit={unit}
              min={MIN_WALL_THICKNESS}
              max={MAX_WALL_THICKNESS}
              step={0.005}
              decimals={3}
              onCommit={handleThicknessChange}
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

          <div style={{ height: 1, background: color.border, margin: '10px 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: color.text }}>Pictures</span>
            <UploadPictureButton
              onFile={handleUploadPicture}
              label="+ Upload"
              style={{
                padding: '4px 10px',
                background: color.brand,
                border: `1px solid ${color.brand}`,
                borderRadius: radius.sm,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            />
          </div>

          {activeWallPictures.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeWallPictures.map((pic) => (
                <PictureItemRow
                  key={pic.id}
                  item={pic}
                  onUpdate={handleUpdatePicture}
                  onRemove={handleRemovePicture}
                  color={color}
                  unit={unit}
                />
              ))}
            </div>
          )}

          <OpeningSection
            title="Doors"
            label="door"
            items={activeWallDoors}
            onAdd={handleAddDoor}
            onUpdate={handleUpdateDoor}
            onRemove={handleRemoveDoor}
            minWidth={0.3}
            color={color}
            unit={unit}
          />

          <OpeningSection
            title="Windows"
            label="window"
            items={activeWallWindows}
            onAdd={handleAddWindow}
            onUpdate={handleUpdateWindow}
            onRemove={handleRemoveWindow}
            minWidth={0.2}
            minHeight={0.2}
            color={color}
            unit={unit}
          />
        </div>
      )}

      {furniturePicker && (
        <div
          className="pixel-shadow"
          style={{
            position: 'absolute',
            left: furniturePicker.x,
            top: furniturePicker.y,
            width: FURNITURE_POPUP_WIDTH,
            background: color.bg,
            border: `1.5px solid ${color.text}`,
            borderRadius: radius.md,
            '--pixel-shadow-color': color.text,
            padding: 10,
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: color.text }}>Add furniture</span>
            <button
              onClick={closeFurniturePicker}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {FURNITURE_PRESETS.map((preset) => (
              <button
                key={preset.type}
                className="pixel-btn"
                onClick={() => handleAddFurniture(preset)}
                style={{
                  padding: '7px 0',
                  borderRadius: radius.sm,
                  border: `1px solid ${color.border}`,
                  background: color.surface,
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
        </div>
      )}
    </div>
  )
}
