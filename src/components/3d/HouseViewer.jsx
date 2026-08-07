import { useRef, useState } from 'react'
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

  const handleSelectWall = (kind, key) => {
    if (kind === 'boundary') selectBoundaryWall(key)
    else selectInteriorWall(key)
  }

  const closeColorPicker = () => setColorPicker(null)

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
    selectRoom(null)
    closeColorPicker()
  }

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

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
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
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: color.text }}>
              {colorPicker.kind === 'boundary' ? WALL_LABELS[colorPicker.key] : 'Interior wall'}
            </span>
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
          <HexColorPicker color={activeColor} onChange={handleColorChange} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  )
}
