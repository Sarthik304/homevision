// Pure geometry for resizing a furniture item by dragging one of its corners (framework-free).

export const MIN_FURNITURE_SIZE = 0.2 // meters, smallest a furniture item can be resized to

// resizes item's footprint by dragging one corner, keeping the opposite corner fixed
export function resizeFurnitureCorner(item, corner, pointerX, pointerY, roomWidth, roomHeight) {
  const left = item.x
  const top = item.y
  const right = item.x + item.width
  const bottom = item.y + item.depth

  const clampedX = Math.min(roomWidth, Math.max(0, pointerX))
  const clampedY = Math.min(roomHeight, Math.max(0, pointerY))

  const movesLeft = corner === 'tl' || corner === 'bl'
  const movesRight = corner === 'tr' || corner === 'br'
  const movesTop = corner === 'tl' || corner === 'tr'
  const movesBottom = corner === 'bl' || corner === 'br'

  const newLeft = movesLeft ? Math.max(0, Math.min(clampedX, right - MIN_FURNITURE_SIZE)) : left
  const newRight = movesRight ? Math.min(roomWidth, Math.max(clampedX, left + MIN_FURNITURE_SIZE)) : right
  const newTop = movesTop ? Math.max(0, Math.min(clampedY, bottom - MIN_FURNITURE_SIZE)) : top
  const newBottom = movesBottom ? Math.min(roomHeight, Math.max(clampedY, top + MIN_FURNITURE_SIZE)) : bottom

  return { x: newLeft, y: newTop, width: newRight - newLeft, depth: newBottom - newTop }
}
