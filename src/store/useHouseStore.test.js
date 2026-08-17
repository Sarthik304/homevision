import { beforeEach, describe, expect, it } from 'vitest'
import useHouseStore from './useHouseStore'

// Living Room (id 1) spans x:[0,12], Bedroom (id 2) spans x:[12,22], both y:[0,10] — flush along
// Living Room's right / Bedroom's left, the adjacency addDoor/updateDoor/resyncSharedDoors relies on.
const LIVING_ROOM_ID = 1
const BEDROOM_ID = 2

const initialState = useHouseStore.getState()

beforeEach(() => {
  useHouseStore.setState(initialState, true)
})

function getRoom(id) {
  return useHouseStore.getState().rooms.find((r) => r.id === id)
}

describe('toggleUnit', () => {
  it('toggles between meters and feet, defaulting to meters', () => {
    expect(useHouseStore.getState().unit).toBe('m')
    useHouseStore.getState().toggleUnit()
    expect(useHouseStore.getState().unit).toBe('ft')
    useHouseStore.getState().toggleUnit()
    expect(useHouseStore.getState().unit).toBe('m')
  })
})

describe('addDoor', () => {
  it('mirrors a door into the adjacent room on the matching wall', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')

    const livingRoom = getRoom(LIVING_ROOM_ID)
    const bedroom = getRoom(BEDROOM_ID)
    expect(livingRoom.doors).toHaveLength(1)
    expect(bedroom.doors).toHaveLength(1)

    const doorId = livingRoom.doors[0].id
    expect(bedroom.doors[0].id).toBe(doorId)
    expect(bedroom.doors[0].wall).toBe('left')
    expect(bedroom.doors[0].offset).toBeCloseTo(0.5)
  })

  it('does not add a mirrored door on a wall with no adjacent room', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'left')
    expect(getRoom(LIVING_ROOM_ID).doors).toHaveLength(1)
    expect(getRoom(BEDROOM_ID).doors).toHaveLength(0)
  })
})

describe('updateDoor', () => {
  it('propagates an offset/width change to the mirrored half', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')
    const doorId = getRoom(LIVING_ROOM_ID).doors[0].id

    useHouseStore.getState().updateDoor(LIVING_ROOM_ID, doorId, { offset: 0.25, width: 1.2 })

    const bedroomDoor = getRoom(BEDROOM_ID).doors[0]
    expect(bedroomDoor.width).toBe(1.2)
    expect(bedroomDoor.offset).toBeCloseTo(0.25)
  })
})

describe('resyncSharedDoors (via updateRoom)', () => {
  it('re-centers the moved room\'s door onto its still-adjacent neighbor\'s door', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')
    useHouseStore.getState().updateDoor(LIVING_ROOM_ID, getRoom(LIVING_ROOM_ID).doors[0].id, { offset: 0.3 })

    // slide Living Room down by 2m — its right wall (x=12) still lines up with Bedroom's left
    // wall, and the two still overlap in y, so the doorway is still shared
    useHouseStore.getState().updateRoom(LIVING_ROOM_ID, { y: 2 })

    const livingRoom = getRoom(LIVING_ROOM_ID)
    const bedroom = getRoom(BEDROOM_ID)
    // Bedroom (unmoved) stays the fixed reference at offset 0.3; Living Room recomputes its own
    // offset so the physical doorway position (world y = 0 + 0.3*10 = 3) stays put
    expect(bedroom.doors[0].offset).toBeCloseTo(0.3)
    expect(livingRoom.doors[0].offset).toBeCloseTo((3 - 2) / 10)
  })

  it('stops resyncing once the room is no longer adjacent to its old partner', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')

    useHouseStore.getState().updateRoom(LIVING_ROOM_ID, { x: 100, y: 100 })

    // no adjacent room anymore, so the door is left exactly as it was rather than erroring or
    // snapping to something unrelated
    expect(getRoom(LIVING_ROOM_ID).doors[0].offset).toBeCloseTo(0.5)
    expect(getRoom(LIVING_ROOM_ID).doors[0].wall).toBe('right')
  })
})

describe('removeDoor', () => {
  it('removes both halves of a shared door', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')
    const doorId = getRoom(LIVING_ROOM_ID).doors[0].id

    useHouseStore.getState().removeDoor(LIVING_ROOM_ID, doorId)

    expect(getRoom(LIVING_ROOM_ID).doors).toHaveLength(0)
    expect(getRoom(BEDROOM_ID).doors).toHaveLength(0)
  })

  it('also works called from the mirrored side, since it legitimately owns the same door id', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')
    const doorId = getRoom(LIVING_ROOM_ID).doors[0].id

    useHouseStore.getState().removeDoor(BEDROOM_ID, doorId)

    expect(getRoom(LIVING_ROOM_ID).doors).toHaveLength(0)
    expect(getRoom(BEDROOM_ID).doors).toHaveLength(0)
  })

  it('no-ops when roomId does not actually own doorId, instead of deleting it from wherever it is found', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')
    const doorId = getRoom(LIVING_ROOM_ID).doors[0].id

    // Bedroom's own id (2) is a real room, but doorId here belongs to a door on Living Room/Bedroom
    // — simulate a caller passing a roomId that has nothing to do with this door at all
    useHouseStore.getState().removeDoor(999, doorId)

    expect(getRoom(LIVING_ROOM_ID).doors).toHaveLength(1)
    expect(getRoom(BEDROOM_ID).doors).toHaveLength(1)
  })
})

describe('toggleWall closing a gap to a nearby room', () => {
  it('pulls the room flush against a nearby room when the facing wall is removed', () => {
    // pull Bedroom 0.4m away from Living Room's right edge (still within snap-close range)
    useHouseStore.getState().updateRoom(BEDROOM_ID, { x: 12.4 })

    useHouseStore.getState().toggleWall(LIVING_ROOM_ID, 'right')

    const livingRoom = getRoom(LIVING_ROOM_ID)
    expect(livingRoom.x).toBeCloseTo(0.4)
    expect(livingRoom.x + livingRoom.width).toBeCloseTo(getRoom(BEDROOM_ID).x)
  })

  it('leaves already-flush rooms untouched (no gap to close)', () => {
    useHouseStore.getState().toggleWall(LIVING_ROOM_ID, 'right')

    expect(getRoom(LIVING_ROOM_ID).x).toBe(0)
    expect(getRoom(BEDROOM_ID).x).toBe(12)
  })

  it('does not snap rooms that are farther apart than the tolerance', () => {
    useHouseStore.getState().updateRoom(BEDROOM_ID, { x: 20 }) // 8m gap, well beyond "nearby"

    useHouseStore.getState().toggleWall(LIVING_ROOM_ID, 'right')

    expect(getRoom(LIVING_ROOM_ID).x).toBe(0)
  })

  it('only closes the gap when the wall is being removed, not when re-adding it', () => {
    useHouseStore.getState().updateRoom(BEDROOM_ID, { x: 12.4 })
    useHouseStore.getState().toggleWall(LIVING_ROOM_ID, 'right') // removes it, snaps to x: 0.4

    useHouseStore.getState().toggleWall(LIVING_ROOM_ID, 'right') // re-adds it

    expect(getRoom(LIVING_ROOM_ID).x).toBeCloseTo(0.4) // stays snapped, doesn't move back
    expect(getRoom(LIVING_ROOM_ID).walls.right).toBe(true)
  })

  it('drops its own door on the removed wall without crashing the gap-close (pre-existing toggleWall behavior — it does not also clear the mirrored door on the neighbor)', () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right') // rooms start flush, so this mirrors
    useHouseStore.getState().updateRoom(BEDROOM_ID, { x: 12.3 }) // now just a 0.3m gap

    useHouseStore.getState().toggleWall(LIVING_ROOM_ID, 'right')

    expect(getRoom(LIVING_ROOM_ID).doors).toHaveLength(0)
    // gap still closes correctly regardless of the door bookkeeping above
    const livingRoom = getRoom(LIVING_ROOM_ID)
    expect(livingRoom.x + livingRoom.width).toBeCloseTo(getRoom(BEDROOM_ID).x)
  })
})

describe('entity ids', () => {
  it('never collides across rapid, same-tick creations', () => {
    const store = useHouseStore.getState()
    store.addRoom('rect')
    store.addRoom('rect')
    store.addRoom('rect')

    const ids = useHouseStore.getState().rooms.map((r) => r.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('selectRoom', () => {
  it('selecting a room keeps selectedRoomIds in sync as a one-element array', () => {
    useHouseStore.getState().selectRoom(LIVING_ROOM_ID)
    expect(useHouseStore.getState().selectedRoomIds).toEqual([LIVING_ROOM_ID])
  })

  it('deselecting (null) clears selectedRoomIds too', () => {
    useHouseStore.getState().selectRoom(LIVING_ROOM_ID)
    useHouseStore.getState().selectRoom(null)
    expect(useHouseStore.getState().selectedRoomIds).toEqual([])
  })

  it('clears any wall selection', () => {
    useHouseStore.getState().selectBoundaryWall('top')
    useHouseStore.getState().selectRoom(LIVING_ROOM_ID)
    expect(useHouseStore.getState().selectedBoundaryWallKey).toBeNull()
  })
})

describe('toggleRoomSelection', () => {
  it('adds an unselected room to the set, and mirrors it onto selectedRoomId while alone', () => {
    useHouseStore.getState().toggleRoomSelection(LIVING_ROOM_ID)
    expect(useHouseStore.getState().selectedRoomIds).toEqual([LIVING_ROOM_ID])
    expect(useHouseStore.getState().selectedRoomId).toBe(LIVING_ROOM_ID)
  })

  it('adding a second room clears selectedRoomId (no single-room detail editor while multi-selected)', () => {
    useHouseStore.getState().toggleRoomSelection(LIVING_ROOM_ID)
    useHouseStore.getState().toggleRoomSelection(BEDROOM_ID)

    expect(useHouseStore.getState().selectedRoomIds.sort()).toEqual([LIVING_ROOM_ID, BEDROOM_ID].sort())
    expect(useHouseStore.getState().selectedRoomId).toBeNull()
  })

  it('toggling an already-selected room removes just that one, leaving the rest', () => {
    useHouseStore.getState().toggleRoomSelection(LIVING_ROOM_ID)
    useHouseStore.getState().toggleRoomSelection(BEDROOM_ID)
    useHouseStore.getState().toggleRoomSelection(LIVING_ROOM_ID)

    expect(useHouseStore.getState().selectedRoomIds).toEqual([BEDROOM_ID])
    // back down to one room, so selectedRoomId re-syncs to it
    expect(useHouseStore.getState().selectedRoomId).toBe(BEDROOM_ID)
  })

  it('clears any wall selection', () => {
    useHouseStore.getState().selectInteriorWall(99)
    useHouseStore.getState().toggleRoomSelection(LIVING_ROOM_ID)
    expect(useHouseStore.getState().selectedInteriorWallId).toBeNull()
  })
})

describe('setSelectedRoomIds', () => {
  it('bulk-replaces the selection, e.g. after a marquee drag', () => {
    useHouseStore.getState().setSelectedRoomIds([LIVING_ROOM_ID, BEDROOM_ID])
    expect(useHouseStore.getState().selectedRoomIds.sort()).toEqual([LIVING_ROOM_ID, BEDROOM_ID].sort())
    expect(useHouseStore.getState().selectedRoomId).toBeNull()
  })

  it('mirrors a single-element list onto selectedRoomId', () => {
    useHouseStore.getState().setSelectedRoomIds([BEDROOM_ID])
    expect(useHouseStore.getState().selectedRoomId).toBe(BEDROOM_ID)
  })

  it('an empty list clears selectedRoomId', () => {
    useHouseStore.getState().selectRoom(LIVING_ROOM_ID)
    useHouseStore.getState().setSelectedRoomIds([])
    expect(useHouseStore.getState().selectedRoomId).toBeNull()
  })
})

describe('removeRoom', () => {
  it('drops the removed room from selectedRoomIds without touching the rest of the selection', () => {
    useHouseStore.getState().setSelectedRoomIds([LIVING_ROOM_ID, BEDROOM_ID])
    useHouseStore.getState().removeRoom(LIVING_ROOM_ID)

    expect(useHouseStore.getState().selectedRoomIds).toEqual([BEDROOM_ID])
  })
})

describe('loadRooms', () => {
  it('replaces the whole house and clears selection state tied to the previous rooms', () => {
    useHouseStore.getState().selectRoom(LIVING_ROOM_ID)
    useHouseStore.getState().selectBoundaryWall('top')

    const newRooms = [
      {
        id: 99,
        name: 'Loaded Room',
        x: 0,
        y: 0,
        width: 5,
        height: 5,
        wallColor: '#ffffff',
        floorColor: '#ffffff',
        walls: { top: true, bottom: true, left: true, right: true },
        wallColors: {},
        doors: [],
        windows: [],
        interiorWalls: [],
      },
    ]
    useHouseStore.getState().loadRooms(newRooms)

    const state = useHouseStore.getState()
    expect(state.rooms).toBe(newRooms)
    expect(state.selectedRoomId).toBeNull()
    expect(state.selectedRoomIds).toEqual([])
    expect(state.selectedBoundaryWallKey).toBeNull()
    expect(state.selectedInteriorWallId).toBeNull()
  })
})

describe('moveRoomsTo', () => {
  it('moves every room in the batch to its given position in one call', () => {
    useHouseStore.getState().moveRoomsTo([
      { id: LIVING_ROOM_ID, x: 5, y: 5 },
      { id: BEDROOM_ID, x: 50, y: 50 },
    ])

    expect(getRoom(LIVING_ROOM_ID)).toMatchObject({ x: 5, y: 5 })
    expect(getRoom(BEDROOM_ID)).toMatchObject({ x: 50, y: 50 })
  })

  it("re-centers a moved room's door onto its still-adjacent neighbor's door, same as updateRoom", () => {
    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')
    useHouseStore.getState().updateDoor(LIVING_ROOM_ID, getRoom(LIVING_ROOM_ID).doors[0].id, { offset: 0.3 })

    // slide Living Room down by 2m via moveRoomsTo instead of updateRoom — same adjacency math
    useHouseStore.getState().moveRoomsTo([{ id: LIVING_ROOM_ID, x: 0, y: 2 }])

    const livingRoom = getRoom(LIVING_ROOM_ID)
    const bedroom = getRoom(BEDROOM_ID)
    expect(bedroom.doors[0].offset).toBeCloseTo(0.3)
    expect(livingRoom.doors[0].offset).toBeCloseTo((3 - 2) / 10)
  })

  it('resyncs doors for every room in the batch, not just the first', () => {
    useHouseStore.getState().addRoom('rect') // third room, no adjacency to either — id 3
    const thirdId = useHouseStore.getState().rooms[2].id
    useHouseStore.getState().updateRoom(thirdId, { x: 12, y: 20, width: 10, height: 10 })
    useHouseStore.getState().addDoor(thirdId, 'top') // no adjacent room on this wall

    useHouseStore.getState().addDoor(LIVING_ROOM_ID, 'right')
    useHouseStore.getState().updateDoor(LIVING_ROOM_ID, getRoom(LIVING_ROOM_ID).doors[0].id, { offset: 0.3 })

    // move Living Room (has a shared door to resync) and the third room (doesn't) in the same call
    useHouseStore.getState().moveRoomsTo([
      { id: LIVING_ROOM_ID, x: 0, y: 2 },
      { id: thirdId, x: 12, y: 30 },
    ])

    expect(getRoom(LIVING_ROOM_ID).doors[0].offset).toBeCloseTo((3 - 2) / 10)
    expect(getRoom(BEDROOM_ID).doors[0].offset).toBeCloseTo(0.3)
    expect(getRoom(thirdId)).toMatchObject({ x: 12, y: 30 })
  })
})
