// Pure 3D wall-layout math, free of three.js so it's unit-testable without the renderer.
// Room3D.jsx uses this for both rect and L-shaped rooms via two separate implementations —
// unifying them (a rect is just an L with a zero-size notch) would touch rendering, wall-toggle
// UI, and door adjacency at once, more risk than the duplication. Each has its own parity test in
// wallGeometry.test.js pinning its 2D/3D offset convention, so drift (how the original
// door-offset bug happened) gets caught immediately.
import { getLEdges } from '../constants/lshape'

export const WALL_THICKNESS = 0.1
export const WALL_INSET = WALL_THICKNESS / 2
const EPS = 0.001

// {length, position, rotation, trimStart, trimEnd} for a plain rectangular room's 4 boundary
// walls. Offset 0 is the left end for top/bottom walls and the top end for left/right walls,
// matching FloorPlanEditor's RoomWalls (2D) — see the parity test in wallGeometry.test.js.
// left/right get trimmed by one thickness at each end so their boxes tuck behind the full-length
// top/bottom boxes at the corners instead of overlapping (see clipSegments in Room3D.jsx).
export function getRectWallDefs(width, height) {
  return [
    { key: 'bottom', length: width, position: [0, 0, height / 2 - WALL_INSET], rotation: [0, 0, 0], trimStart: 0, trimEnd: 0 },
    { key: 'top', length: width, position: [0, 0, -height / 2 + WALL_INSET], rotation: [0, 0, 0], trimStart: 0, trimEnd: 0 },
    { key: 'left', length: height, position: [-width / 2 + WALL_INSET, 0, 0], rotation: [0, -Math.PI / 2, 0], trimStart: WALL_THICKNESS, trimEnd: WALL_THICKNESS },
    { key: 'right', length: height, position: [width / 2 - WALL_INSET, 0, 0], rotation: [0, -Math.PI / 2, 0], trimStart: WALL_THICKNESS, trimEnd: WALL_THICKNESS },
  ]
}

// Same {length, position, rotation, trimStart, trimEnd} shape as getRectWallDefs, derived
// generically from an L-shaped room's 6 edges (see constants/lshape): inset each edge's centerline
// by WALL_INSET so its outer face sits on the true boundary, derive rotation from the edge
// direction, and trim only vertical (x-constant) edges by one thickness at each end so they tuck
// behind the horizontal edges at the corners.
export function getLWallDefs(width, height, notchWidth, notchHeight) {
  return getLEdges(width, height, notchWidth, notchHeight).map(({ key, from, to }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy)
    const nx = -dy / length
    const ny = dx / length
    const midX = (from.x + to.x) / 2 + nx * WALL_INSET
    const midY = (from.y + to.y) / 2 + ny * WALL_INSET
    const isVertical = Math.abs(dx) < EPS
    // every corner is convex (90°) except where notchV meets notchH — the L's one reflex (270°)
    // corner. notchH is already full-length across it, but trimming notchV's end there too would
    // leave a WALL_THICKNESS-square hole nothing else covers. So notchV alone skips that end's trim.
    return {
      key,
      length,
      position: [midX - width / 2, 0, midY - height / 2],
      rotation: [0, Math.atan2(-dy, dx), 0],
      trimStart: isVertical ? WALL_THICKNESS : 0,
      trimEnd: isVertical && key !== 'notchV' ? WALL_THICKNESS : 0,
    }
  })
}
