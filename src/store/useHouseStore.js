import { create } from 'zustand'
import { DEFAULT_L_WALLS } from '../constants/lshape'

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }

// applies fn to one interior wall (by roomId + wallId), leaving everything else untouched
function mapWall(rooms, roomId, wallId, fn) {
  return rooms.map((room) =>
    room.id !== roomId
      ? room
      : { ...room, interiorWalls: room.interiorWalls.map((w) => (w.id === wallId ? fn(w) : w)) }
  )
}

const WALL_ADJACENCY = { right: 'left', left: 'right', top: 'bottom', bottom: 'top' }
const ADJACENCY_TOLERANCE = 0.05 // meters — how close two rooms' boundary walls must sit to count as one shared wall

// finds the neighboring room whose boundary wall sits flush against room's wallKey edge (e.g. two
// rooms snapped side by side), so a door placed there can double as an opening in both walls.
// L-shaped rooms sit out of this entirely — their notch walls have no compass opposite to mirror
// onto, and an L's outer walls don't line up with mirrorOffset's rectangle-only math.
function findAdjacentWall(rooms, room, wallKey) {
  if (room.shape === 'L') return null
  const otherWallKey = WALL_ADJACENCY[wallKey]
  if (!otherWallKey) return null
  const other = rooms.find((r) => {
    if (r.id === room.id) return false
    if (r.shape === 'L') return false
    if (!(r.walls ?? DEFAULT_WALLS)[otherWallKey]) return false
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

// converts a door's offset (0-1 fraction along room's wallKey edge) into the equivalent offset
// along otherRoom's wall, using the shared physical position where the two walls touch
function mirrorOffset(room, wallKey, offset, otherRoom) {
  const raw =
    wallKey === 'top' || wallKey === 'bottom'
      ? (room.x + offset * room.width - otherRoom.x) / otherRoom.width
      : (room.y + offset * room.height - otherRoom.y) / otherRoom.height
  return Math.min(1, Math.max(0, raw))
}

// after `room`'s geometry changes (dragged or resized), re-aligns any shared doorway (see addDoor)
// by pulling room's own door back onto the matching door of whichever neighbor is still adjacent —
// the neighbor didn't move, so it stays the fixed reference; only the room that moved needs to
// recompute its offset to keep sitting at the same physical spot on the shared wall
function resyncSharedDoors(rooms, room) {
  let changed = false
  const doors = room.doors.map((d) => {
    const adjacent = findAdjacentWall(rooms, room, d.wall)
    if (!adjacent) return d
    const partner = rooms.find((r) => r.id === adjacent.room.id)
    const partnerDoor = partner?.doors.find((pd) => pd.id === d.id)
    if (!partnerDoor) return d
    changed = true
    return {
      ...d,
      offset: mirrorOffset(partner, adjacent.wallKey, partnerDoor.offset, room),
      width: partnerDoor.width,
    }
  })
  return changed ? rooms.map((r) => (r.id === room.id ? { ...r, doors } : r)) : rooms
}

// shared by addRoom/addFloor: both spawn an 8x8 box centered on the current viewport, differing
// only in name prefix, floor tint, shape, and whether it starts with boundary walls already up
function createRoom(namePrefix, count, viewCenter, { floorColor, walls, shape }) {
  const width = 8
  const height = 8
  return {
    id: Date.now(),
    name: `${namePrefix} ${count + 1}`,
    x: viewCenter.x - width / 2,
    y: viewCenter.y - height / 2,
    width,
    height,
    shape,
    ...(shape === 'L' ? { notchWidth: width / 2, notchHeight: height / 2 } : {}),
    wallColor: '#ffffff',
    floorColor,
    walls,
    wallColors: {},
    doors: [],
    windows: [],
    interiorWalls: [],
  }
}

const useHouseStore = create((set) => ({
  rooms: [
    {
      id: 1,
      name: 'Living Room',
      x: 0,
      y: 0,
      width: 12,
      height: 10,
      wallColor: '#f5f0eb',
      floorColor: '#c8a882',
      walls: { ...DEFAULT_WALLS },
      wallColors: {},
      doors: [],
      windows: [],
      interiorWalls: [],
    },
    {
      id: 2,
      name: 'Bedroom',
      x: 12,
      y: 0,
      width: 10,
      height: 10,
      wallColor: '#e8f0fe',
      floorColor: '#a0aec0',
      walls: { ...DEFAULT_WALLS },
      wallColors: {},
      doors: [],
      windows: [],
      interiorWalls: [],
    },
  ],

  selectedRoomId: null,
  selectedInteriorWallId: null,
  selectedBoundaryWallKey: null,
  activeView: '2d',
  darkMode: false,
  // room-space point currently centered in the 2D viewport, kept in sync by FloorPlanEditor;
  // new rooms/floors spawn here so they appear where the user is looking, not off in a corner
  viewCenter: { x: 11, y: 5 },

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  setViewCenter: (x, y) => set({ viewCenter: { x, y } }),

  // selecting a room clears any wall selection, and vice versa (see selectInteriorWall/selectBoundaryWall)
  selectRoom: (id) => set({ selectedRoomId: id, selectedInteriorWallId: null, selectedBoundaryWallKey: null }),

  selectInteriorWall: (wallId) => set({ selectedInteriorWallId: wallId, selectedBoundaryWallKey: null }),

  selectBoundaryWall: (wallKey) => set({ selectedBoundaryWallKey: wallKey, selectedInteriorWallId: null }),

  setActiveView: (view) => set({ activeView: view }),

  updateRoomColor: (id, type, color) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === id ? { ...room, [type]: color } : room
      ),
    })),

  addRoom: (shape = 'rect') =>
    set((state) => ({
      rooms: [
        ...state.rooms,
        createRoom('Room', state.rooms.length, state.viewCenter, {
          floorColor: '#d4c5a9',
          walls: shape === 'L' ? { ...DEFAULT_L_WALLS } : { ...DEFAULT_WALLS },
          shape,
        }),
      ],
    })),

  addFloor: () =>
    set((state) => ({
      rooms: [
        ...state.rooms,
        createRoom('Floor', state.rooms.length, state.viewCenter, {
          floorColor: '#e2d6c1',
          walls: { top: false, bottom: false, left: false, right: false },
          shape: 'rect',
        }),
      ],
    })),

  removeRoom: (id) =>
    set((state) => {
      const rooms = state.rooms.filter((room) => room.id !== id)
      const wallStillExists = rooms.some((room) =>
        (room.interiorWalls ?? []).some((w) => w.id === state.selectedInteriorWallId)
      )
      return {
        rooms,
        selectedRoomId: state.selectedRoomId === id ? null : state.selectedRoomId,
        selectedInteriorWallId: wallStillExists ? state.selectedInteriorWallId : null,
        selectedBoundaryWallKey: state.selectedRoomId === id ? null : state.selectedBoundaryWallKey,
      }
    }),

  updateRoom: (id, updates) =>
    set((state) => {
      const rooms = state.rooms.map((room) => (room.id === id ? { ...room, ...updates } : room))
      const geometryChanged = ['x', 'y', 'width', 'height', 'notchWidth', 'notchHeight'].some(
        (key) => key in updates
      )
      if (!geometryChanged) return { rooms }
      const movedRoom = rooms.find((r) => r.id === id)
      return { rooms: resyncSharedDoors(rooms, movedRoom) }
    }),

  toggleWall: (roomId, wallKey) =>
    set((state) => ({
      rooms: state.rooms.map((room) => {
        if (room.id !== roomId) return room
        const wallNowPresent = !room.walls[wallKey]
        return {
          ...room,
          walls: { ...room.walls, [wallKey]: wallNowPresent },
          doors: wallNowPresent ? room.doors : room.doors.filter((d) => d.wall !== wallKey),
          windows: wallNowPresent ? room.windows : room.windows.filter((w) => w.wall !== wallKey),
        }
      }),
      selectedBoundaryWallKey:
        state.selectedBoundaryWallKey === wallKey && state.selectedRoomId === roomId
          ? null
          : state.selectedBoundaryWallKey,
    })),

  updateWallColor: (roomId, wallKey, color) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? { ...room, wallColors: { ...(room.wallColors ?? {}), [wallKey]: color } }
          : room
      ),
    })),

  // placing a door on a wall that's flush against a neighboring room's wall (snapped side by
  // side) also opens a matching door in that neighbor's wall, so it reads as one shared doorway
  addDoor: (roomId, wall) =>
    set((state) => {
      const room = state.rooms.find((r) => r.id === roomId)
      if (!room) return {}
      const id = Date.now()
      const offset = 0.5
      const width = 0.9
      const adjacent = findAdjacentWall(state.rooms, room, wall)
      return {
        rooms: state.rooms.map((r) => {
          if (r.id === roomId) return { ...r, doors: [...r.doors, { id, wall, offset, width }] }
          if (adjacent && r.id === adjacent.room.id) {
            return {
              ...r,
              doors: [
                ...r.doors,
                { id, wall: adjacent.wallKey, offset: mirrorOffset(room, wall, offset, r), width },
              ],
            }
          }
          return r
        }),
      }
    }),

  // keeps a shared doorway's other half (see addDoor) in sync when its offset/width is adjusted
  updateDoor: (roomId, doorId, updates) =>
    set((state) => {
      const room = state.rooms.find((r) => r.id === roomId)
      const door = room?.doors.find((d) => d.id === doorId)
      const adjacent = door ? findAdjacentWall(state.rooms, room, door.wall) : null
      return {
        rooms: state.rooms.map((r) => {
          if (r.id === roomId) {
            return { ...r, doors: r.doors.map((d) => (d.id === doorId ? { ...d, ...updates } : d)) }
          }
          if (adjacent && r.id === adjacent.room.id) {
            return {
              ...r,
              doors: r.doors.map((d) =>
                d.id === doorId
                  ? {
                      ...d,
                      width: updates.width ?? d.width,
                      offset:
                        updates.offset !== undefined
                          ? mirrorOffset(room, door.wall, updates.offset, r)
                          : d.offset,
                    }
                  : d
              ),
            }
          }
          return r
        }),
      }
    }),

  // door ids are unique across the whole plan, so removing by id also clears a shared doorway's other half
  removeDoor: (roomId, doorId) =>
    set((state) => ({
      rooms: state.rooms.map((room) => ({
        ...room,
        doors: room.doors.filter((d) => d.id !== doorId),
      })),
    })),

  addWindow: (roomId, wall) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              windows: [...room.windows, { id: Date.now(), wall, offset: 0.5, width: 1.2, height: 1.2 }],
            }
          : room
      ),
    })),

  updateWindow: (roomId, windowId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              windows: room.windows.map((w) => (w.id === windowId ? { ...w, ...updates } : w)),
            }
          : room
      ),
    })),

  removeWindow: (roomId, windowId) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? { ...room, windows: room.windows.filter((w) => w.id !== windowId) }
          : room
      ),
    })),

  addInteriorWall: (roomId) =>
    set((state) => ({
      rooms: state.rooms.map((room) => {
        if (room.id !== roomId) return room
        return {
          ...room,
          interiorWalls: [
            ...room.interiorWalls,
            {
              id: Date.now(),
              x1: room.width * 0.25,
              y1: room.height / 2,
              x2: room.width * 0.75,
              y2: room.height / 2,
              thickness: 0.1,
              doors: [],
              windows: [],
            },
          ],
        }
      }),
    })),

  updateInteriorWall: (roomId, wallId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              interiorWalls: room.interiorWalls.map((w) =>
                w.id === wallId ? { ...w, ...updates } : w
              ),
            }
          : room
      ),
    })),

  removeInteriorWall: (roomId, wallId) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? { ...room, interiorWalls: room.interiorWalls.filter((w) => w.id !== wallId) }
          : room
      ),
      selectedInteriorWallId: state.selectedInteriorWallId === wallId ? null : state.selectedInteriorWallId,
    })),

  addInteriorDoor: (roomId, wallId) =>
    set((state) => ({
      rooms: mapWall(state.rooms, roomId, wallId, (w) => ({
        ...w,
        doors: [...w.doors, { id: Date.now(), offset: 0.5, width: 0.9 }],
      })),
    })),

  updateInteriorDoor: (roomId, wallId, doorId, updates) =>
    set((state) => ({
      rooms: mapWall(state.rooms, roomId, wallId, (w) => ({
        ...w,
        doors: w.doors.map((d) => (d.id === doorId ? { ...d, ...updates } : d)),
      })),
    })),

  removeInteriorDoor: (roomId, wallId, doorId) =>
    set((state) => ({
      rooms: mapWall(state.rooms, roomId, wallId, (w) => ({
        ...w,
        doors: w.doors.filter((d) => d.id !== doorId),
      })),
    })),

  addInteriorWindow: (roomId, wallId) =>
    set((state) => ({
      rooms: mapWall(state.rooms, roomId, wallId, (w) => ({
        ...w,
        windows: [...w.windows, { id: Date.now(), offset: 0.5, width: 1.2, height: 1.2 }],
      })),
    })),

  updateInteriorWindow: (roomId, wallId, windowId, updates) =>
    set((state) => ({
      rooms: mapWall(state.rooms, roomId, wallId, (w) => ({
        ...w,
        windows: w.windows.map((win) => (win.id === windowId ? { ...win, ...updates } : win)),
      })),
    })),

  removeInteriorWindow: (roomId, wallId, windowId) =>
    set((state) => ({
      rooms: mapWall(state.rooms, roomId, wallId, (w) => ({
        ...w,
        windows: w.windows.filter((win) => win.id !== windowId),
      })),
    })),
}))

export default useHouseStore
