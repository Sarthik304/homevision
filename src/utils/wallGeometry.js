// Pure 3D wall-layout math, kept free of three.js/@react-three so it can be unit tested without
// pulling in the renderer. Room3D.jsx consumes this for both the plain-rectangle and L-shaped
// room cases — two separate hand-written implementations rather than one shared one (a rect is
// geometrically just an L-shape with a zero-size notch, but unifying them touches rendering,
// wall-toggle UI, and door adjacency all at once, more risk than the duplication itself). Since
// the two CAN drift out of sync silently (that's exactly how the door-offset direction bug
// happened), each has its own parity test in wallGeometry.test.js pinning its 2D/3D offset
// convention, so a future edit to either gets caught immediately instead of shipping quietly.
import { getLEdges } from '../constants/lshape'

export const WALL_THICKNESS = 0.1
export const WALL_INSET = WALL_THICKNESS / 2
const EPS = 0.001

// {length, position, rotation, trimStart, trimEnd} for a plain rectangular room's 4 boundary
// walls. Offset 0 is the left end for top/bottom walls and the top end for left/right walls,
// matching FloorPlanEditor's RoomWalls (2D) — see the parity test in wallGeometry.test.js.
export function getRectWallDefs(width, height) {
  return [
    { key: 'bottom', length: width, position: [0, 0, height / 2 - WALL_INSET], rotation: [0, 0, 0], trimStart: 0, trimEnd: 0 },
    { key: 'top', length: width, position: [0, 0, -height / 2 + WALL_INSET], rotation: [0, 0, 0], trimStart: 0, trimEnd: 0 },
    { key: 'left', length: height, position: [-width / 2 + WALL_INSET, 0, 0], rotation: [0, -Math.PI / 2, 0], trimStart: WALL_THICKNESS, trimEnd: WALL_THICKNESS },
    { key: 'right', length: height, position: [width / 2 - WALL_INSET, 0, 0], rotation: [0, -Math.PI / 2, 0], trimStart: WALL_THICKNESS, trimEnd: WALL_THICKNESS },
  ]
}

// derives the same {length, position, rotation, trimStart, trimEnd} shape getRectWallDefs uses,
// but generically from an L-shaped room's 6 edges (see constants/lshape). The formulas were
// reverse-engineered from the rect case and verified to reproduce it exactly: inset the edge's
// centerline inward by WALL_INSET (so its outer face sits on the true boundary), derive rotation
// from the edge direction, and trim only the "vertical" (x-constant) edges by a wall thickness at
// both ends so they tuck behind the "horizontal" edges at each corner.
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
    // every corner here is convex (90°) except the one where notchV meets notchH — the L's single
    // reflex (270°) corner. There, notchH is already full-length across it (as it is at every
    // corner), but trimming notchV's end the same way every other vertical edge gets trimmed
    // leaves a WALL_THICKNESS-square hole neither wall covers, since nothing else runs through
    // that corner to fill in for it. So notchV alone skips the trim on that end.
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
