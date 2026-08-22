// Pure 3D wall-layout math for rect and L-shaped rooms, framework-free for unit testing.
import { getLEdges } from '../constants/lshape'

export const WALL_THICKNESS = 0.1
export const WALL_INSET = WALL_THICKNESS / 2
const EPS = 0.001

// {length, position, rotation, trimStart, trimEnd} for a rectangular room's 4 boundary walls
export function getRectWallDefs(width, height) {
  return [
    { key: 'bottom', length: width, position: [0, 0, height / 2 - WALL_INSET], rotation: [0, 0, 0], trimStart: 0, trimEnd: 0 },
    { key: 'top', length: width, position: [0, 0, -height / 2 + WALL_INSET], rotation: [0, 0, 0], trimStart: 0, trimEnd: 0 },
    { key: 'left', length: height, position: [-width / 2 + WALL_INSET, 0, 0], rotation: [0, -Math.PI / 2, 0], trimStart: WALL_THICKNESS, trimEnd: WALL_THICKNESS },
    { key: 'right', length: height, position: [width / 2 - WALL_INSET, 0, 0], rotation: [0, -Math.PI / 2, 0], trimStart: WALL_THICKNESS, trimEnd: WALL_THICKNESS },
  ]
}

// same wall-def shape as getRectWallDefs, derived from an L-shaped room's 6 edges
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
    // notchV skips end-trim at the L's one reflex corner (notchH is already full-length there)
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
