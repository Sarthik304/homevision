// shared between FloorPlanEditor (rendering) and useHouseStore (placing new rooms at the
// current viewport center) so both agree on the room-meters <-> canvas-pixels conversion
export const SCALE = 20
export const PADDING = 40
export const MIN_ROOM_SIZE = 1 // meters — smallest a room can be, whether resized by drag or typed in directly
