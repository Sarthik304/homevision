// Geometry for L-shaped rooms: a rectangle with a rectangular notch removed from its
// top-right corner. All values are in meters, local to the room's own (0,0) top-left origin.
// v1 only supports the top-right orientation — flipping the notch to another corner would
// mean a second full set of edge/trim math, so it's left for a future pass.

export const RECT_WALL_KEYS = ['top', 'bottom', 'left', 'right']
export const L_WALL_KEYS = ['top', 'notchV', 'notchH', 'right', 'bottom', 'left']
export const DEFAULT_L_WALLS = Object.fromEntries(L_WALL_KEYS.map((k) => [k, true]))
export const MIN_NOTCH = 0.5 // meters — smallest the notch can be shrunk to, so both legs of the L stay usable

export function isLShape(room) {
  return room.shape === 'L'
}

export function getWallKeys(room) {
  return isLShape(room) ? L_WALL_KEYS : RECT_WALL_KEYS
}

// ordered clockwise from the top-left corner, walking `from` -> `to`; the interior of the
// room sits to the right of each edge's direction, same winding InteriorWalls' normals assume
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
