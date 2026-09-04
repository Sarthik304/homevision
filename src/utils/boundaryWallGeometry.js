// Pure geometry for editing a room's own boundary walls (rect/L/quad) by typed length
// (framework-free, unit-testable).
import { MIN_ROOM_SIZE } from '../constants/floorPlan'
import { MIN_NOTCH } from '../constants/lshape'
import { quadCornersOf } from '../constants/quad'

export const MIN_BOUNDARY_WALL_LENGTH = 0.2 // meters, smallest a quad's boundary wall can be typed to

// clockwise corner pair [from, to] for each quad edge key — 'from' is the anchor, 'to' is the corner that moves
const QUAD_EDGE_ENDPOINTS = { top: ['tl', 'tr'], right: ['tr', 'br'], bottom: ['br', 'bl'], left: ['bl', 'tl'] }
const QUAD_EDGE_FALLBACK_DIR = { top: { x: 1, y: 0 }, right: { x: 0, y: 1 }, bottom: { x: -1, y: 0 }, left: { x: 0, y: -1 } }

// a room's current boundary-wall length (meters), any shape
export function getBoundaryWallLength(room, wallKey) {
  if (room.shape === 'quad') {
    const corners = quadCornersOf(room)
    const [fromKey, toKey] = QUAD_EDGE_ENDPOINTS[wallKey]
    return Math.hypot(corners[toKey].x - corners[fromKey].x, corners[toKey].y - corners[fromKey].y)
  }
  if (room.shape === 'L') {
    switch (wallKey) {
      case 'top': return room.width - room.notchWidth
      case 'notchV': return room.notchHeight
      case 'notchH': return room.notchWidth
      case 'right': return room.height - room.notchHeight
      case 'bottom': return room.width
      case 'left': return room.height
      default: return 0
    }
  }
  return wallKey === 'top' || wallKey === 'bottom' ? room.width : room.height
}

// resizes a rect room so wallKey's own length becomes newLength, always anchored at the room's own
// (x, y) origin — never shifts the room's position, so typing a length can't shove it into a
// neighboring room the way anchoring at the far corner could
function resizeRectWall(room, wallKey, newLength) {
  const length = Math.max(MIN_ROOM_SIZE, newLength)
  return wallKey === 'top' || wallKey === 'bottom' ? { width: length } : { height: length }
}

// same convention for an L-shaped room's 6 edges — top/notchH grow the notch or bounding box as
// needed to keep the rest of the outline fixed, mirroring resizeLRoomForEdge's box-handle clamps;
// none of these ever move (x, y), for the same reason as resizeRectWall above
function resizeLWall(room, wallKey, newLength) {
  const { width, height, notchWidth, notchHeight } = room
  switch (wallKey) {
    case 'top':
      return { width: Math.max(MIN_ROOM_SIZE, newLength) + notchWidth }
    case 'notchV':
      return { notchHeight: Math.min(height - MIN_ROOM_SIZE, Math.max(MIN_NOTCH, newLength)) }
    case 'notchH': {
      const nw = Math.min(width - MIN_ROOM_SIZE, Math.max(MIN_NOTCH, newLength))
      return { notchWidth: nw, width: width - notchWidth + nw }
    }
    case 'right':
      return { height: Math.max(MIN_ROOM_SIZE, newLength) + notchHeight }
    case 'bottom':
      return { width: Math.max(MIN_ROOM_SIZE + notchWidth, newLength) }
    case 'left':
      return { height: Math.max(MIN_ROOM_SIZE + notchHeight, newLength) }
    default: return {}
  }
}

// { x, y, width, height, notchWidth?, notchHeight? } patch to pass straight to updateRoom
export function resizeRectOrLWall(room, wallKey, newLength) {
  return room.shape === 'L' ? resizeLWall(room, wallKey, newLength) : resizeRectWall(room, wallKey, newLength)
}

// moves a quad wall's far corner outward/inward along the wall's current angle so its length
// becomes newLength, keeping the near corner fixed — not clamped to the room, matching how
// dragging a quad corner can already stretch it outside the box
export function resizeQuadWall(room, wallKey, newLength) {
  const corners = quadCornersOf(room)
  const [fromKey, toKey] = QUAD_EDGE_ENDPOINTS[wallKey]
  const from = corners[fromKey]
  const to = corners[toKey]
  const currentLength = Math.hypot(to.x - from.x, to.y - from.y)
  const fallback = QUAD_EDGE_FALLBACK_DIR[wallKey]
  const ux = currentLength > 1e-6 ? (to.x - from.x) / currentLength : fallback.x
  const uy = currentLength > 1e-6 ? (to.y - from.y) / currentLength : fallback.y
  const length = Math.max(MIN_BOUNDARY_WALL_LENGTH, newLength)
  return {
    cornerKey: toKey,
    point: {
      x: Math.round((from.x + ux * length) * 10) / 10,
      y: Math.round((from.y + uy * length) * 10) / 10,
    },
  }
}
