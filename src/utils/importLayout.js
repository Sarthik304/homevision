// Turns the AI-detected {name, x, y, width, height} rooms (from api/analyze-layout) into full
// HomeVision room objects — framework-free so the sanitization can be unit-tested without a DOM.
import { nextId } from './id'
import { MIN_ROOM_SIZE } from '../constants/floorPlan'

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }
const NO_WALLS = { top: false, bottom: false, left: false, right: false }

// cycles so imported rooms get visibly distinct floors without depending on the model for color
const FLOOR_PALETTE = ['#c8a882', '#a0aec0', '#b8cfa0', '#d8a6a0', '#a6c4d8', '#cbb8e0', '#e0c68a', '#9fd0c4']

// the model's per-room coordinates are estimated from a photo, not measured — rooms meant to be
// adjacent often end up a little apart. Close gaps up to this size (meters) between rooms that
// overlap enough along their shared edge to clearly be neighbors, not unrelated nearby rooms.
const GAP_SNAP_TOLERANCE = 0.5
const MIN_SHARED_EDGE_FRACTION = 0.3

function toFiniteNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function overlapLength(aStart, aEnd, bStart, bEnd) {
  return Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
}

// nudges each room toward any neighbor it's almost touching, closing small gaps left by the
// model's imprecise coordinate estimates. Only ever moves a room (never resizes it), and only by
// small, capped amounts, so labeled dimensions are preserved.
//
// Processes rooms in order, mutating a shared working copy: once a room has been snapped, later
// rooms see its final position, so a gap between two rooms only ever gets closed once — closing it
// from both sides independently would double-count the gap and push the pair into an overlap.
function snapAdjacentRooms(rooms) {
  const working = rooms.map((room) => ({ ...room }))

  for (let i = 0; i < working.length; i++) {
    const room = working[i]
    let dx = 0
    let dy = 0
    let bestGap = GAP_SNAP_TOLERANCE

    for (let j = 0; j < working.length; j++) {
      if (j === i) continue
      const other = working[j]

      const vOverlap = overlapLength(room.y, room.y + room.height, other.y, other.y + other.height)
      const vSpan = Math.min(room.height, other.height)
      if (vSpan > 0 && vOverlap / vSpan >= MIN_SHARED_EDGE_FRACTION) {
        const gapRight = other.x - (room.x + room.width)
        if (gapRight > 0 && gapRight < bestGap) {
          bestGap = gapRight
          dx = gapRight
          dy = 0
        }
        const gapLeft = room.x - (other.x + other.width)
        if (gapLeft > 0 && gapLeft < bestGap) {
          bestGap = gapLeft
          dx = -gapLeft
          dy = 0
        }
      }

      const hOverlap = overlapLength(room.x, room.x + room.width, other.x, other.x + other.width)
      const hSpan = Math.min(room.width, other.width)
      if (hSpan > 0 && hOverlap / hSpan >= MIN_SHARED_EDGE_FRACTION) {
        const gapBelow = other.y - (room.y + room.height)
        if (gapBelow > 0 && gapBelow < bestGap) {
          bestGap = gapBelow
          dx = 0
          dy = gapBelow
        }
        const gapAbove = room.y - (other.y + other.height)
        if (gapAbove > 0 && gapAbove < bestGap) {
          bestGap = gapAbove
          dx = 0
          dy = -gapAbove
        }
      }
    }

    room.x += dx
    room.y += dy
  }

  return working
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
    walls: rawRoom?.hasWalls === false ? { ...NO_WALLS } : { ...DEFAULT_WALLS },
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
  const rooms = rawRooms.map((room, i) => toHouseRoom(room, i))
  return snapAdjacentRooms(rooms)
}
