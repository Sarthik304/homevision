import { create } from 'zustand'

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
    },
  ],

  selectedRoomId: null,
  activeView: '3d',

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
}))

export default useHouseStore
