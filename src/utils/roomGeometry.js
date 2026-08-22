// Pure room-geometry math for the 2D editor's drag/resize/rotate handling (framework-free).

export const SNAP_THRESHOLD = 0.6 // meters, how close an edge has to get before it snaps flush

// rotates point (px,py) by `deg` around (cx,cy); positive deg is clockwise (matches Konva)
export function rotateAround(px, py, cx, cy, deg) {
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = px - cx
  const dy = py - cy
  return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos }
}

// screen-space bounding box for rooms on the 90° grid (width/height swap at 90°/270°); null otherwise
export function getRoomAABB(room) {
  const rotation = (((room.rotation ?? 0) % 360) + 360) % 360
  if (rotation % 90 !== 0) return null
  const swapped = (rotation / 90) % 2 === 1
  const width = swapped ? room.height : room.width
  const height = swapped ? room.width : room.height
  const cx = room.x + room.width / 2
  const cy = room.y + room.height / 2
  return { x: cx - width / 2, y: cy - height / 2, width, height }
}

export function getSnappedPosition(room, otherRooms, x, y) {
  const w = room.width
  const h = room.height
  let snappedX = x
  let snappedY = y
  let xSnapped = false
  let ySnapped = false
  let bestXDist = SNAP_THRESHOLD
  let bestYDist = SNAP_THRESHOLD

  otherRooms.forEach((other) => {
    const verticalOverlap = y < other.y + other.height && y + h > other.y
    const horizontalOverlap = x < other.x + other.width && x + w > other.x

    if (verticalOverlap) {
      const distRightToLeft = Math.abs(x + w - other.x)
      if (distRightToLeft < bestXDist) {
        bestXDist = distRightToLeft
        snappedX = other.x - w
        xSnapped = true
      }
      const distLeftToRight = Math.abs(x - (other.x + other.width))
      if (distLeftToRight < bestXDist) {
        bestXDist = distLeftToRight
        snappedX = other.x + other.width
        xSnapped = true
      }
    }

    if (horizontalOverlap) {
      const distBottomToTop = Math.abs(y + h - other.y)
      if (distBottomToTop < bestYDist) {
        bestYDist = distBottomToTop
        snappedY = other.y - h
        ySnapped = true
      }
      const distTopToBottom = Math.abs(y - (other.y + other.height))
      if (distTopToBottom < bestYDist) {
        bestYDist = distTopToBottom
        snappedY = other.y + other.height
        ySnapped = true
      }
    }
  })

  // corner-to-corner snapping for diagonal rooms with no shared edge
  const draggedCorners = [
    { x, y },
    { x: x + w, y },
    { x, y: y + h },
    { x: x + w, y: y + h },
  ]
  let bestCornerDist = SNAP_THRESHOLD
  let cornerDelta = null

  otherRooms.forEach((other) => {
    const otherCorners = [
      { x: other.x, y: other.y },
      { x: other.x + other.width, y: other.y },
      { x: other.x, y: other.y + other.height },
      { x: other.x + other.width, y: other.y + other.height },
    ]
    draggedCorners.forEach((dc) => {
      otherCorners.forEach((oc) => {
        const dist = Math.hypot(dc.x - oc.x, dc.y - oc.y)
        if (dist < bestCornerDist) {
          bestCornerDist = dist
          cornerDelta = { dx: oc.x - dc.x, dy: oc.y - dc.y }
        }
      })
    })
  })

  if (cornerDelta) {
    snappedX = x + cornerDelta.dx
    snappedY = y + cornerDelta.dy
    xSnapped = true
    ySnapped = true
  }

  return { x: snappedX, y: snappedY, xSnapped, ySnapped }
}
