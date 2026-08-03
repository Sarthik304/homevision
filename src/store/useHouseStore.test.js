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
