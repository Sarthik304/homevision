// Pure geometry for quad corner-dragging, plus shape-agnostic room polygon/wall-angle helpers (framework-free).
import { getLPolygon } from '../constants/lshape'
import { getQuadPolygon, quadCornersOf } from '../constants/quad'
import { rotateAround } from './roomGeometry'

// meters, distance within which a dragged corner snaps to a box reference point or another room's edge
export const QUAD_SNAP_THRESHOLD = 0.35

// snaps a dragged corner (local space) to the nearest box corner/edge-midpoint/center — null if nothing's close
export function snapQuadCorner(width, height, rawX, rawY) {
  const candidates = [
    { x: 0, y: 0 },
    { x: width / 2, y: 0 },
    { x: width, y: 0 },
    { x: 0, y: height / 2 },
    { x: width / 2, y: height / 2 },
    { x: width, y: height / 2 },
    { x: 0, y: height },
    { x: width / 2, y: height },
    { x: width, y: height },
  ]

  let best = null
  let bestDist = QUAD_SNAP_THRESHOLD
  candidates.forEach((c) => {
    const dist = Math.hypot(rawX - c.x, rawY - c.y)
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  })
  return best
}

// world-space outline of any room (rect, L-shaped, or quad), accounting for its own rotation
export function getRoomWorldPolygon(room) {
  const localPoints =
    room.shape === 'L'
      ? getLPolygon(room.width, room.height, room.notchWidth, room.notchHeight)
      : room.shape === 'quad'
        ? getQuadPolygon(quadCornersOf(room))
        : [
            { x: 0, y: 0 },
            { x: room.width, y: 0 },
            { x: room.width, y: room.height },
            { x: 0, y: room.height },
          ]

  const rotation = room.rotation ?? 0
  const centerX = room.x + room.width / 2
  const centerY = room.y + room.height / 2
  return localPoints.map((p) => {
    const worldX = room.x + p.x
    const worldY = room.y + p.y
    return rotation ? rotateAround(worldX, worldY, centerX, centerY, rotation) : { x: worldX, y: worldY }
  })
}

// closest point to p on the segment a-b, clamped to the segment (not the infinite line through it)
function nearestPointOnSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq < 1e-9) return { x: a.x, y: a.y }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return { x: a.x + t * dx, y: a.y + t * dy }
}

// snaps a world-space point to the nearest corner or side of any other room — null if nothing's close
export function snapToOtherRooms(rooms, excludeRoomId, worldPoint) {
  let best = null
  let bestDist = QUAD_SNAP_THRESHOLD
  rooms.forEach((room) => {
    if (room.id === excludeRoomId) return
    const polygon = getRoomWorldPolygon(room)
    polygon.forEach((a, i) => {
      const b = polygon[(i + 1) % polygon.length]
      const candidate = nearestPointOnSegment(worldPoint, a, b)
      const dist = Math.hypot(worldPoint.x - candidate.x, worldPoint.y - candidate.y)
      if (dist < bestDist) {
        bestDist = dist
        best = candidate
      }
    })
  })
  return best
}

// every wall's world-space orientation for any room shape, normalized to [0, 180) degrees
export function getRoomWallAngles(room) {
  const polygon = getRoomWorldPolygon(room)
  const angles = []
  polygon.forEach((a, i) => {
    const b = polygon[(i + 1) % polygon.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    if (Math.hypot(dx, dy) < 1e-6) return
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI
    angles.push(((deg % 180) + 180) % 180)
  })
  return angles
}
