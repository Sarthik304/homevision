// Geometry for freeform quadrilateral rooms: a rectangle whose 4 corners can be dragged independently into any irregular quad.

export const QUAD_CORNER_KEYS = ['tl', 'tr', 'br', 'bl']

// default corners: the plain rectangle inscribed in its own bounding box
export function defaultQuadCorners(width, height) {
  return {
    tl: { x: 0, y: 0 },
    tr: { x: width, y: 0 },
    br: { x: width, y: height },
    bl: { x: 0, y: height },
  }
}

// a room's corners, falling back to a plain rectangle if it somehow has none yet
export function quadCornersOf(room) {
  return room.corners ?? defaultQuadCorners(room.width, room.height)
}

// the quad's 4 edges, walked clockwise from top-left, using the same wall keys as a plain rect
export function getQuadEdges(corners) {
  return [
    { key: 'top', from: corners.tl, to: corners.tr },
    { key: 'right', from: corners.tr, to: corners.br },
    { key: 'bottom', from: corners.br, to: corners.bl },
    { key: 'left', from: corners.bl, to: corners.tl },
  ]
}

export function getQuadPolygon(corners) {
  return QUAD_CORNER_KEYS.map((key) => corners[key])
}

// rescales corner offsets proportionally after the bounding box is resized, preserving the shape
export function rescaleQuadCorners(corners, oldWidth, oldHeight, newWidth, newHeight) {
  const sx = oldWidth > 0 ? newWidth / oldWidth : 1
  const sy = oldHeight > 0 ? newHeight / oldHeight : 1
  return Object.fromEntries(
    QUAD_CORNER_KEYS.map((key) => [key, { x: corners[key].x * sx, y: corners[key].y * sy }])
  )
}
