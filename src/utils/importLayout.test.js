import { describe, expect, it } from 'vitest'
import { importedLayoutToHouseRooms } from './importLayout'
import { MIN_ROOM_SIZE } from '../constants/floorPlan'

describe('importedLayoutToHouseRooms', () => {
  it('maps a well-formed layout into full store-ready rooms', () => {
    const rooms = importedLayoutToHouseRooms({
      rooms: [
        { name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
        { name: 'Kitchen', x: 5, y: 0, width: 3, height: 4 },
      ],
    })

    expect(rooms).toHaveLength(2)
    expect(rooms[0]).toMatchObject({ name: 'Living Room', x: 0, y: 0, width: 5, height: 4, walls: { top: true, bottom: true, left: true, right: true } })
    expect(rooms[1]).toMatchObject({ name: 'Kitchen', x: 5, y: 0, width: 3, height: 4 })
    // every room gets a full, valid shape the rest of the app already assumes
    rooms.forEach((room) => {
      expect(typeof room.id).toBe('string')
      expect(room.doors).toEqual([])
      expect(room.windows).toEqual([])
      expect(room.pictures).toEqual([])
      expect(room.interiorWalls).toEqual([])
      expect(room.furniture).toEqual([])
    })
  })

  it('gives each room a distinct id even with duplicate names', () => {
    const rooms = importedLayoutToHouseRooms({
      rooms: [
        { name: 'Bedroom', x: 0, y: 0, width: 3, height: 3 },
        { name: 'Bedroom', x: 3, y: 0, width: 3, height: 3 },
      ],
    })
    expect(rooms[0].id).not.toBe(rooms[1].id)
  })

  it('cycles floor colors so rooms are visibly distinct', () => {
    const rooms = importedLayoutToHouseRooms({
      rooms: Array.from({ length: 3 }, (_, i) => ({ name: `Room ${i}`, x: i * 3, y: 0, width: 3, height: 3 })),
    })
    const colors = new Set(rooms.map((r) => r.floorColor))
    expect(colors.size).toBe(3)
  })

  it('falls back to a generated name when the model omits one', () => {
    const rooms = importedLayoutToHouseRooms({ rooms: [{ x: 0, y: 0, width: 3, height: 3 }] })
    expect(rooms[0].name).toBe('Room 1')
  })

  it('floors non-finite or too-small dimensions at MIN_ROOM_SIZE instead of breaking rendering', () => {
    const rooms = importedLayoutToHouseRooms({
      rooms: [
        { name: 'Bad', x: 0, y: 0, width: 0, height: -5 },
        { name: 'NaN', x: 'oops', y: null, width: 'nope', height: undefined },
      ],
    })
    expect(rooms[0].width).toBe(MIN_ROOM_SIZE)
    expect(rooms[0].height).toBe(MIN_ROOM_SIZE)
    expect(rooms[1].x).toBe(0)
    expect(rooms[1].y).toBe(0)
    expect(rooms[1].width).toBeGreaterThanOrEqual(MIN_ROOM_SIZE)
    expect(rooms[1].height).toBeGreaterThanOrEqual(MIN_ROOM_SIZE)
  })

  it('returns an empty array for a missing or malformed rooms field', () => {
    expect(importedLayoutToHouseRooms({})).toEqual([])
    expect(importedLayoutToHouseRooms({ rooms: 'not an array' })).toEqual([])
    expect(importedLayoutToHouseRooms(null)).toEqual([])
  })
})
