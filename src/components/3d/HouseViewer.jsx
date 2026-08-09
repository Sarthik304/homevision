import { useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { HexColorPicker } from 'react-colorful'
import { useShallow } from 'zustand/react/shallow'
import Room3D from './Room3D'
import useHouseStore from '../../store/useHouseStore'
import { getColors, radius } from '../../theme'

const WALL_LABELS = { top: 'Top wall', bottom: 'Bottom wall', left: 'Left wall', right: 'Right wall' }
const POPUP_WIDTH = 200
const POPUP_HEIGHT = 250

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

// useShallow avoids re-rendering on unrelated store changes
const selectHouseViewerState = (s) => ({
  rooms: s.rooms,
  selectedRoomId: s.selectedRoomId,
  selectRoom: s.selectRoom,
  selectBoundaryWall: s.selectBoundaryWall,
  selectInteriorWall: s.selectInteriorWall,
  updateWallColor: s.updateWallColor,
  updateInteriorWall: s.updateInteriorWall,
  darkMode: s.darkMode,
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
    darkMode,
  } = useHouseStore(useShallow(selectHouseViewerState))
  const color = getColors(darkMode)
  const containerRef = useRef(null)
  const [colorPicker, setColorPicker] = useState(null) // { roomId, kind, key, x, y }
  const [pickMode, setPickMode] = useState(false) // sampling a colour from another wall

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
    const rawX = nativeEvent.clientX - rect.left
    const rawY = nativeEvent.clientY - rect.top
    setColorPicker({
      roomId,
      kind,
      key,
      x: Math.min(Math.max(8, rawX), rect.width - POPUP_WIDTH - 8),
      y: Math.min(Math.max(8, rawY), rect.height - POPUP_HEIGHT - 8),
    })
  }

  const handleDeselect = () => {
    if (pickMode) {
      setPickMode(false)
      return
    }
    selectRoom(null)
    closeColorPicker()
  }

  useEffect(() => {
    if (!pickMode) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setPickMode(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pickMode])

  // rooms use absolute 2D coords that can drift far from the origin — recenter on the
  // bounding-box middle so the house stays on the grid instead of drifting off it
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

  const handleColorChange = (c) => {
    if (!colorPicker) return
    if (colorPicker.kind === 'boundary') {
      updateWallColor(colorPicker.roomId, colorPicker.key, c)
    } else {
      updateInteriorWall(colorPicker.roomId, colorPicker.key, { color: c })
    }
  }

  const handleWallColorPick = (roomId, kind, key) => {
    const sourceRoom = rooms.find((r) => r.id === roomId)
    if (!sourceRoom) return
    handleColorChange(getWallColor(sourceRoom, kind, key))
    setPickMode(false)
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', cursor: pickMode ? 'crosshair' : 'default' }}>
      <Canvas
        camera={{
          position: [20, 20, 20],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        shadows
      >
        <color attach="background" args={[color.workspace]} />

        <ambientLight intensity={darkMode ? 0.3 : 0.5} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={darkMode ? 0.7 : 1}
          castShadow
        />

        <Environment preset="apartment" />

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
              isSelected={room.id === selectedRoomId}
              onClick={selectRoom}
              onSelectWall={handleSelectWall}
              onWallDoubleClick={handleWallDoubleClick}
              pickMode={pickMode}
              onWallColorPick={handleWallColorPick}
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
          style={{
            position: 'absolute',
            left: colorPicker.x,
            top: colorPicker.y,
            width: POPUP_WIDTH,
            background: color.bg,
            border: `1px solid ${color.border}`,
            borderRadius: radius.md,
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            padding: 10,
            zIndex: 10,
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
            <span style={{ fontSize: 12, fontWeight: 700, color: color.text }}>
              {colorPicker.kind === 'boundary' ? WALL_LABELS[colorPicker.key] : 'Interior wall'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
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
        </div>
      )}
    </div>
  )
}
