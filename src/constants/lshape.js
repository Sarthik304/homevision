// Geometry for L-shaped rooms: a rectangle with a notch removed from its top-right corner
// (only orientation supported). Values are in meters, local to the room's (0,0) top-left origin.

export const RECT_WALL_KEYS = ['top', 'bottom', 'left', 'right']
export const L_WALL_KEYS = ['top', 'notchV', 'notchH', 'right', 'bottom', 'left']
export const DEFAULT_L_WALLS = Object.fromEntries(L_WALL_KEYS.map((k) => [k, true]))
export const MIN_NOTCH = 0.5 // meters, smallest the notch can shrink to

export function isLShape(room) {
  return room.shape === 'L'
}

export function getWallKeys(room) {
  return isLShape(room) ? L_WALL_KEYS : RECT_WALL_KEYS
}

// the L's 6 edges, ordered clockwise from the top-left corner
export function getLEdges(width, height, notchWidth, notchHeight) {
  const w = width
  const h = height
  const nw = Math.min(notchWidth, width)
  const nh = Math.min(notchHeight, height)
  const a = { x: 0, y: 0 }
  const b = { x: w - nw, y: 0 }
  const c = { x: w - nw, y: nh }
  const d = { x: w, y: nh }
  const e = { x: w, y: h }
  const f = { x: 0, y: h }
  return [
    { key: 'top', from: a, to: b },
    { key: 'notchV', from: b, to: c },
    { key: 'notchH', from: c, to: d },
    { key: 'right', from: d, to: e },
    { key: 'bottom', from: e, to: f },
    { key: 'left', from: f, to: a },
  ]
}

export function getLPolygon(width, height, notchWidth, notchHeight) {
  return getLEdges(width, height, notchWidth, notchHeight).map((edge) => edge.from)
}
