// Pure geometry for dragging one corner of a freeform quadrilateral room (framework-free).

// meters, distance within which a dragged corner snaps to a box corner/edge-midpoint/center —
// makes it easy to land exactly on a rhombus, kite, or trapezoid instead of eyeballing it
export const QUAD_SNAP_THRESHOLD = 0.35

// clamps a dragged corner to the room's bounding box, then snaps it to the nearest of the box's
// 4 corners, 4 edge-midpoints, or center if it's close enough
export function clampAndSnapQuadCorner(width, height, rawX, rawY) {
  const x = Math.min(width, Math.max(0, rawX))
  const y = Math.min(height, Math.max(0, rawY))

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

  let best = { x, y }
  let bestDist = QUAD_SNAP_THRESHOLD
  candidates.forEach((c) => {
    const dist = Math.hypot(x - c.x, y - c.y)
    if (dist < bestDist) {
      bestDist = dist
      best = c
    }
  })
  return best
}
