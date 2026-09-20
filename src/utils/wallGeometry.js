// Pure 3D wall-layout math for rect, L-shaped, and freeform quadrilateral rooms, framework-free for unit testing.
import { getLEdges } from '../constants/lshape'
import { getQuadEdges } from '../constants/quad'

// India standard brick-wall thicknesses: a 9" (230mm) external/load-bearing wall, a 4.5" (115mm)
// internal partition wall — see IS 1905/SP 7 (National Building Code). Either can be overridden
// per room (boundary) or per wall (interior) by typing an exact thickness in the 3D view's wall
// popup, next to its colour picker.
export const WALL_THICKNESS = 0.23
export const INTERIOR_WALL_THICKNESS = 0.115
export const MIN_WALL_THICKNESS = 0.05
export const MAX_WALL_THICKNESS = 0.6
const EPS = 0.001

// {length, position, rotation, trimStart, trimEnd} for a rectangular room's 4 boundary walls.
// `thickness` is either one number shared by all 4 walls, or a {top,bottom,left,right} map — the
// latter is how Room3D halves a wall's thickness on just the side(s) it shares flush with a
// neighboring room, so the pair reads as one shared wall instead of two full walls stacked
// back to back. Each wall's own thickness only sets its own inset; left/right are trimmed by
// top/bottom's thickness (whichever they actually abut), not their own.
export function getRectWallDefs(width, height, thickness = WALL_THICKNESS) {
  const t = typeof thickness === 'number' ? { top: thickness, bottom: thickness, left: thickness, right: thickness } : thickness
  return [
    { key: 'bottom', length: width, position: [0, 0, height / 2 - t.bottom / 2], rotation: [0, 0, 0], trimStart: 0, trimEnd: 0 },
    { key: 'top', length: width, position: [0, 0, -height / 2 + t.top / 2], rotation: [0, 0, 0], trimStart: 0, trimEnd: 0 },
    { key: 'left', length: height, position: [-width / 2 + t.left / 2, 0, 0], rotation: [0, -Math.PI / 2, 0], trimStart: t.top, trimEnd: t.bottom },
    { key: 'right', length: height, position: [width / 2 - t.right / 2, 0, 0], rotation: [0, -Math.PI / 2, 0], trimStart: t.top, trimEnd: t.bottom },
  ]
}

// same wall-def shape as getRectWallDefs, derived from an L-shaped room's 6 edges
export function getLWallDefs(width, height, notchWidth, notchHeight, thickness = WALL_THICKNESS) {
  const inset = thickness / 2
  return getLEdges(width, height, notchWidth, notchHeight).map(({ key, from, to }) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy)
    const nx = -dy / length
    const ny = dx / length
    const midX = (from.x + to.x) / 2 + nx * inset
    const midY = (from.y + to.y) / 2 + ny * inset
    const isVertical = Math.abs(dx) < EPS
    // notchV skips end-trim at the L's one reflex corner (notchH is already full-length there)
    return {
      key,
      length,
      position: [midX - width / 2, 0, midY - height / 2],
      rotation: [0, Math.atan2(-dy, dx), 0],
      trimStart: isVertical ? thickness : 0,
      trimEnd: isVertical && key !== 'notchV' ? thickness : 0,
    }
  })
}

// which local-Z side of a wall (already positioned/rotated relative to the room's own center) faces
// into the room — used to mount wall-hung items (pictures) on the room-facing surface for any wall
// shape and its own rotation convention, without hardcoding a sign per wall key
export function wallInwardSign(position, rotationY) {
  const [px, , pz] = position
  const sin = Math.sin(rotationY)
  const cos = Math.cos(rotationY)
  const distSq = (s) => (px + s * sin) ** 2 + (pz + s * cos) ** 2
  return distSq(1) <= distSq(-1) ? 1 : -1
}

// same wall-def shape as getRectWallDefs, derived from a quad's 4 corners — left untrimmed since a fixed trim only suits 90° corners, so adjacent walls overlap slightly rather than risk a gap
export function getQuadWallDefs(corners, width, height, thickness = WALL_THICKNESS) {
  const inset = thickness / 2
  return getQuadEdges(corners)
    .map(({ key, from, to }) => {
      const dx = to.x - from.x
      const dy = to.y - from.y
      const length = Math.hypot(dx, dy)
      if (length < EPS) return null
      const nx = -dy / length
      const ny = dx / length
      const midX = (from.x + to.x) / 2 + nx * inset
      const midY = (from.y + to.y) / 2 + ny * inset
      return {
        key,
        length,
        position: [midX - width / 2, 0, midY - height / 2],
        rotation: [0, Math.atan2(-dy, dx), 0],
        trimStart: 0,
        trimEnd: 0,
      }
    })
    .filter(Boolean)
}
