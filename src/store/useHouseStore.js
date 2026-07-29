import { create } from 'zustand'

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }

// Applies `fn` to a single interior wall (identified by roomId + wallId) inside
// the rooms array, leaving every other room/wall untouched.
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
      doors: [],
      windows: [],
      interiorWalls: [],
    },
  ],

  selectedRoomId: null,
  selectedInteriorWallId: null,
  activeView: '2d',
  darkMode: false,

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  // Selecting a room is a separate focus from selecting one of its interior
  // walls, so it clears any wall selection rather than layering on top of it.
  selectRoom: (id) => set({ selectedRoomId: id, selectedInteriorWallId: null }),

  selectInteriorWall: (wallId) => set({ selectedInteriorWallId: wallId }),

  setActiveView: (view) => set({ activeView: view }),

  updateRoomColor: (id, type, color) =>
    set((state) => ({
      rooms: state.rooms.map((room) =>
        room.id === id ? { ...room, [type]: color } : room
      ),
    })),

  addRoom: () =>
    set((state) => ({
      rooms: [
        ...state.rooms,
        {
          id: Date.now(),
          name: `Room ${state.rooms.length + 1}`,
          x: 0,
          y: 0,
          width: 8,
          height: 8,
          wallColor: '#ffffff',
          floorColor: '#d4c5a9',
          walls: { ...DEFAULT_WALLS },
          doors: [],
          windows: [],
          interiorWalls: [],
        },
      ],
    })),

  addFloor: () =>
    set((state) => ({
      rooms: [
        ...state.rooms,
        {
          id: Date.now(),
          name: `Floor ${state.rooms.length + 1}`,
          x: 0,
          y: 0,
          width: 8,
          height: 8,
          wallColor: '#ffffff',
          floorColor: '#e2d6c1',
          walls: { top: false, bottom: false, left: false, right: false },
          doors: [],
          windows: [],
          interiorWalls: [],
        },
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
