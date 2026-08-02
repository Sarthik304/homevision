import { create } from 'zustand'

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }

// applies fn to one interior wall (by roomId + wallId), leaving everything else untouched
function mapWall(rooms, roomId, wallId, fn) {
  return rooms.map((room) =>
    room.id !== roomId
      ? room
      : { ...room, interiorWalls: room.interiorWalls.map((w) => (w.id === wallId ? fn(w) : w)) }
  )
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

  addRoom: () =>
    set((state) => {
      const width = 8
      const height = 8
      return {
        rooms: [
          ...state.rooms,
          {
            id: Date.now(),
            name: `Room ${state.rooms.length + 1}`,
            x: state.viewCenter.x - width / 2,
            y: state.viewCenter.y - height / 2,
            width,
            height,
            wallColor: '#ffffff',
            floorColor: '#d4c5a9',
            walls: { ...DEFAULT_WALLS },
            wallColors: {},
            doors: [],
            windows: [],
            interiorWalls: [],
          },
        ],
      }
    }),

  addFloor: () =>
    set((state) => {
      const width = 8
      const height = 8
      return {
        rooms: [
          ...state.rooms,
          {
            id: Date.now(),
            name: `Floor ${state.rooms.length + 1}`,
            x: state.viewCenter.x - width / 2,
            y: state.viewCenter.y - height / 2,
            width,
            height,
            wallColor: '#ffffff',
            floorColor: '#e2d6c1',
            walls: { top: false, bottom: false, left: false, right: false },
            wallColors: {},
            doors: [],
            windows: [],
            interiorWalls: [],
          },
        ],
      }
    }),

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
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === id ? { ...room, ...updates } : room
      ),
    })),

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

  addDoor: (roomId, wall) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              doors: [...room.doors, { id: Date.now(), wall, offset: 0.5, width: 0.9 }],
            }
          : room
      ),
    })),

  updateDoor: (roomId, doorId, updates) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              doors: room.doors.map((d) => (d.id === doorId ? { ...d, ...updates } : d)),
            }
          : room
      ),
    })),

  removeDoor: (roomId, doorId) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? { ...room, doors: room.doors.filter((d) => d.id !== doorId) }
          : room
      ),
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
