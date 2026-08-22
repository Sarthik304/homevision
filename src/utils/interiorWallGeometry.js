// Pure geometry for interior-wall drag/stretch and marquee selection (Konva-free, unit-testable).

export const MIN_INTERIOR_WALL_LENGTH = 0.2 // meters, smallest an interior wall can be dragged to
export const SNAP_POINT_THRESHOLD = 0.35 // meters, endpoint snap distance to corners/other walls
export const SNAP_ANGLE_THRESHOLD_DEG = 6 // degrees, angle-snap distance (endpoints + room rotation)

// translates a wall's original (drag-start) endpoints by (dxM, dyM), clamped to the room
export function computeWallBodyTranslate(origin, roomWidth, roomHeight, dxM, dyM) {
  const minDx = -Math.min(origin.x1, origin.x2)
  const maxDx = roomWidth - Math.max(origin.x1, origin.x2)
  const minDy = -Math.min(origin.y1, origin.y2)
  const maxDy = roomHeight - Math.max(origin.y1, origin.y2)
  const clampedDx = Math.min(maxDx, Math.max(minDx, dxM))
  const clampedDy = Math.min(maxDy, Math.max(minDy, dyM))

  return {
    x1: origin.x1 + clampedDx,
    y1: origin.y1 + clampedDy,
    x2: origin.x2 + clampedDx,
    y2: origin.y2 + clampedDy,
  }
}

// snaps a dragged endpoint to room corners / other walls' endpoints first, else to the nearest 45°
export function snapInteriorWallEndpoint(room, wall, otherX, otherY, rawX, rawY) {
  const candidates = [
    { x: 0, y: 0 },
    { x: room.width, y: 0 },
    { x: 0, y: room.height },
    { x: room.width, y: room.height },
  ]
  ;(room.interiorWalls ?? []).forEach((w) => {
    if (w.id === wall.id) return
    candidates.push({ x: w.x1, y: w.y1 }, { x: w.x2, y: w.y2 })
  })

  let bestPoint = null
  let bestDist = SNAP_POINT_THRESHOLD
  candidates.forEach((p) => {
    const d = Math.hypot(rawX - p.x, rawY - p.y)
    if (d < bestDist) {
      bestDist = d
      bestPoint = p
    }
  })
  if (bestPoint) return bestPoint

  const dist = Math.hypot(rawX - otherX, rawY - otherY)
  if (dist < 0.001) return { x: rawX, y: rawY }
  const angle = Math.atan2(rawY - otherY, rawX - otherX)
  const step = Math.PI / 4
  const nearestAngle = Math.round(angle / step) * step
  const diffDeg = Math.abs(Math.atan2(Math.sin(angle - nearestAngle), Math.cos(angle - nearestAngle))) * (180 / Math.PI)
  if (diffDeg <= SNAP_ANGLE_THRESHOLD_DEG) {
    return { x: otherX + Math.cos(nearestAngle) * dist, y: otherY + Math.sin(nearestAngle) * dist }
  }
  return { x: rawX, y: rawY }
}

// clamps a dragged endpoint ('a'=x1/y1, 'b'=x2/y2) to the room, snaps it, enforces min length
export function computeWallEndpointMove(room, wall, endpoint, rawX, rawY) {
  const otherX = endpoint === 'a' ? wall.x2 : wall.x1
  const otherY = endpoint === 'a' ? wall.y2 : wall.y1

  const clampedRawX = Math.min(room.width, Math.max(0, rawX))
  const clampedRawY = Math.min(room.height, Math.max(0, rawY))
  const snapped = snapInteriorWallEndpoint(room, wall, otherX, otherY, clampedRawX, clampedRawY)

  let x = Math.min(room.width, Math.max(0, snapped.x))
  let y = Math.min(room.height, Math.max(0, snapped.y))

  if (Math.hypot(x - otherX, y - otherY) < MIN_INTERIOR_WALL_LENGTH) {
    const angle = Math.atan2(y - otherY, x - otherX)
    x = otherX + Math.cos(angle) * MIN_INTERIOR_WALL_LENGTH
    y = otherY + Math.sin(angle) * MIN_INTERIOR_WALL_LENGTH
  }

  return { x, y, updates: endpoint === 'a' ? { x1: x, y1: y } : { x2: x, y2: y } }
}

// which room ids a marquee (rubber-band) box overlaps, in world-pixel space
export function roomsInMarquee(rooms, marquee, scale, padding) {
  const minX = Math.min(marquee.x1, marquee.x2)
  const maxX = Math.max(marquee.x1, marquee.x2)
  const minY = Math.min(marquee.y1, marquee.y2)
  const maxY = Math.max(marquee.y1, marquee.y2)
  return rooms
    .filter((room) => {
      const rx1 = room.x * scale + padding
      const ry1 = room.y * scale + padding
      const rx2 = rx1 + room.width * scale
      const ry2 = ry1 + room.height * scale
      return rx1 < maxX && rx2 > minX && ry1 < maxY && ry2 > minY
    })
    .map((room) => room.id)
}
