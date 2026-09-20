// Detects when two rectangular, unrotated rooms sit flush against each other along one edge.
// Shared by useHouseStore (to keep a shared doorway in sync between both rooms) and Room3D (to
// halve each side's wall thickness where two rooms are flush, so the pair reads as one shared
// wall instead of two full-thickness walls stacked back to back).
export const WALL_ADJACENCY = { right: 'left', left: 'right', top: 'bottom', bottom: 'top' }
export const ADJACENCY_TOLERANCE = 0.05 // meters, max gap to count two boundary walls as flush/shared

// a room with no `shape` at all is a plain rect (the two seed rooms predate the `shape` field)
export function isPlainRect(room) {
  return (room.shape ?? 'rect') === 'rect'
}

// finds the neighboring room whose wall sits flush against room's wallKey edge (rect rooms only)
export function findAdjacentWall(rooms, room, wallKey) {
  if (!isPlainRect(room) || room.rotation) return null
  const otherWallKey = WALL_ADJACENCY[wallKey]
  if (!otherWallKey) return null
  const other = rooms.find((r) => {
    if (r.id === room.id) return false
    if (!isPlainRect(r) || r.rotation) return false
    if (!(r.walls ?? { top: true, bottom: true, left: true, right: true })[otherWallKey]) return false
    if (wallKey === 'right' || wallKey === 'left') {
      const near = wallKey === 'right' ? room.x + room.width : room.x
      const far = wallKey === 'right' ? r.x : r.x + r.width
      if (Math.abs(near - far) > ADJACENCY_TOLERANCE) return false
      return Math.min(room.y + room.height, r.y + r.height) - Math.max(room.y, r.y) > 0
    }
    const near = wallKey === 'bottom' ? room.y + room.height : room.y
    const far = wallKey === 'bottom' ? r.y : r.y + r.height
    if (Math.abs(near - far) > ADJACENCY_TOLERANCE) return false
    return Math.min(room.x + room.width, r.x + r.width) - Math.max(room.x, r.x) > 0
  })
  return other ? { room: other, wallKey: otherWallKey } : null
}
