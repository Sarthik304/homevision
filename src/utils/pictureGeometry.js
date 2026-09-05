// Pure geometry for moving and resizing a wall-hung picture by dragging it (or one of its 4
// corners) in the wall's own local plane (X = along the wall, Y = height off the floor) —
// framework-free, unit-testable.

export const MIN_PICTURE_SIZE = 0.1 // meters, smallest a picture can be dragged down to

// world-space (wall-local) center X of a picture along its wall, from its 0-1 offset convention
export function pictureCenterX(picture, length) {
  return picture.offset * length - length / 2
}

// the corner opposite the one being dragged — stays fixed for the duration of the drag
export function pictureOppositeCorner(picture, centerX, cornerKey) {
  return {
    x: cornerKey.endsWith('l') ? centerX + picture.width / 2 : centerX - picture.width / 2,
    y: cornerKey.startsWith('t') ? picture.bottom : picture.bottom + picture.height,
  }
}

// { width, height, offset, bottom } patch for dragging a corner to `point` (wall-local), keeping
// `anchor` (the opposite corner) fixed — not clamped to the wall's length, only floored at a
// minimum size and kept from dropping below the floor, matching the outward-stretch precedent
// already used for freeform quad rooms and furniture corner-resize
export function resizePictureToPoint(anchor, point, length) {
  const width = Math.max(MIN_PICTURE_SIZE, Math.abs(point.x - anchor.x))
  const height = Math.max(MIN_PICTURE_SIZE, Math.abs(point.y - anchor.y))
  const offset = Math.min(1, Math.max(0, ((point.x + anchor.x) / 2 + length / 2) / length))
  const bottom = Math.max(0, Math.min(point.y, anchor.y))
  return { width, height, offset, bottom }
}

// how far into the picture (from its center) the pointer grabbed it — recorded once at drag start
// so moving it tracks the cursor naturally instead of snapping its center to the pointer
export function pictureGrabOffset(picture, centerX, point) {
  return { x: point.x - centerX, y: point.y - (picture.bottom + picture.height / 2) }
}

// { offset, bottom } patch for moving a picture (width/height unchanged) so it keeps the same
// `grabOffset` from the pointer as when the drag started; floored at the floor, not clamped
// horizontally to the wall's ends — same "can hang past the edge" allowance as resizing
export function movePictureToPoint(point, grabOffset, picture, length) {
  const centerX = point.x - grabOffset.x
  const centerY = point.y - grabOffset.y
  const offset = Math.min(1, Math.max(0, (centerX + length / 2) / length))
  const bottom = Math.max(0, centerY - picture.height / 2)
  return { offset, bottom }
}
