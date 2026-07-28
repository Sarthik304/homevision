import { create } from 'zustand'

const DEFAULT_WALLS = { top: true, bottom: true, left: true, right: true }

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
    },
  ],

  selectedRoomId: null,
  activeView: '2d',
  darkMode: false,

  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

  selectRoom: (id) => set({ selectedRoomId: id }),

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
        },
      ],
    })),

  removeRoom: (id) =>
    set((state) => ({
      rooms: state.rooms.filter((room) => room.id !== id),
      selectedRoomId: state.selectedRoomId === id ? null : state.selectedRoomId,
    })),

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
}))

export default useHouseStore
