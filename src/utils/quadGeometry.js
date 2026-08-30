// Pure geometry for dragging one corner of a freeform quadrilateral room (framework-free).

// meters, distance within which a dragged corner snaps to a box corner/edge-midpoint/center —
// makes it easy to land exactly on a rhombus, kite, or trapezoid instead of eyeballing it
export const QUAD_SNAP_THRESHOLD = 0.35

// snaps a dragged corner to the nearest of the box's 4 corners, 4 edge-midpoints, or center if
// it's close enough — otherwise leaves it exactly where it was dragged, including outside the
// box entirely (stretching a corner outward into a dart/star/arrow point, not just distorting
// the shape inward)
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

  let best = { x: rawX, y: rawY }
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
