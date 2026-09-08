// Turns the AI-detected {name, x, y, width, height} rooms (from api/analyze-layout) into full
// HomeVision room objects — framework-free so the sanitization can be unit-tested without a DOM.
import { nextId } from './id'
import { MIN_ROOM_SIZE } from '../constants/floorPlan'

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }

// cycles so imported rooms get visibly distinct floors without depending on the model for color
const FLOOR_PALETTE = ['#c8a882', '#a0aec0', '#b8cfa0', '#d8a6a0', '#a6c4d8', '#cbb8e0', '#e0c68a', '#9fd0c4']

function toFiniteNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

// builds one store-ready room from one AI-detected room, clamping anything nonsensical (missing
// fields, non-finite or too-small dimensions) so a bad model response can't break rendering
function toHouseRoom(rawRoom, index) {
  const width = Math.max(MIN_ROOM_SIZE, toFiniteNumber(rawRoom?.width, 3))
  const height = Math.max(MIN_ROOM_SIZE, toFiniteNumber(rawRoom?.height, 3))
  const name = typeof rawRoom?.name === 'string' && rawRoom.name.trim() ? rawRoom.name.trim().slice(0, 40) : `Room ${index + 1}`

  return {
    id: nextId(),
    name,
    x: toFiniteNumber(rawRoom?.x, 0),
    y: toFiniteNumber(rawRoom?.y, 0),
    width,
    height,
    wallColor: '#ffffff',
    floorColor: FLOOR_PALETTE[index % FLOOR_PALETTE.length],
    walls: { ...DEFAULT_WALLS },
    wallColors: {},
    doors: [],
    windows: [],
    pictures: [],
    interiorWalls: [],
    furniture: [],
  }
}

// { rooms: [...] } (as returned by /api/analyze-layout) -> rooms ready for useHouseStore.loadRooms
export function importedLayoutToHouseRooms(layout) {
  const rawRooms = Array.isArray(layout?.rooms) ? layout.rooms : []
  return rawRooms.map((room, i) => toHouseRoom(room, i))
}
