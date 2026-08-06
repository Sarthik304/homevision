import { describe, expect, it } from 'vitest'
import {
  MIN_INTERIOR_WALL_LENGTH,
  computeWallBodyTranslate,
  computeWallEndpointMove,
  roomsInMarquee,
  snapInteriorWallEndpoint,
} from './interiorWallGeometry'

describe('computeWallBodyTranslate', () => {
  const room = { width: 10, height: 8 }
  const origin = { x1: 2, y1: 3, x2: 6, y2: 3 }

  it('translates both endpoints by the same offset', () => {
    const result = computeWallBodyTranslate(origin, room.width, room.height, 1.5, -0.5)
    expect(result).toEqual({ x1: 3.5, y1: 2.5, x2: 7.5, y2: 2.5 })
  })

  it('clamps so neither endpoint leaves the room', () => {
    // dragging far to the right/down should stop once x2 hits room.width / y hits room.height
    const result = computeWallBodyTranslate(origin, room.width, room.height, 100, 100)
    expect(result.x2).toBeCloseTo(room.width)
    expect(result.y1).toBeCloseTo(room.height)
    expect(result.y2).toBeCloseTo(room.height)
  })

  it('clamps so neither endpoint goes below zero', () => {
    const result = computeWallBodyTranslate(origin, room.width, room.height, -100, -100)
    expect(result.x1).toBeCloseTo(0)
    expect(result.y1).toBeCloseTo(0)
    expect(result.y2).toBeCloseTo(0)
  })

  // this is the actual bug that shipped: Konva reports dxM/dyM as the TOTAL offset since the
  // drag began, not a per-frame delta. Feeding that total against a FIXED origin (as the
  // wallBodyDragRef snapshot in FloorPlanEditor does) must stay linear in the drag distance —
  // repeatedly calling this with a growing "total so far" should never accelerate or compound,
  // which is exactly what broke when the old code added the total onto an already-updated value.
  it('stays linear in the total drag distance across repeated calls with a fixed origin', () => {
    const totals = [0.1, 0.3, 0.6, 1.0, 1.5] // monotonically increasing "distance since drag start"
    const results = totals.map((t) => computeWallBodyTranslate(origin, room.width, room.height, t, 0))
    results.forEach((r, i) => {
      expect(r.x1).toBeCloseTo(origin.x1 + totals[i])
      expect(r.x2).toBeCloseTo(origin.x2 + totals[i])
    })
  })
})

describe('snapInteriorWallEndpoint', () => {
  const room = { width: 10, height: 8, interiorWalls: [] }
  const wall = { id: 'w1', x1: 1, y1: 1, x2: 5, y2: 1 }

  it('snaps to a room corner within threshold', () => {
    const snapped = snapInteriorWallEndpoint(room, wall, 5, 1, 0.1, 0.1)
    expect(snapped).toEqual({ x: 0, y: 0 })
  })

  it("snaps to another wall's endpoint within threshold", () => {
    const roomWithOtherWall = {
      ...room,
      interiorWalls: [wall, { id: 'w2', x1: 4, y1: 4, x2: 7, y2: 7 }],
    }
    const snapped = snapInteriorWallEndpoint(roomWithOtherWall, wall, 5, 1, 4.1, 4.05)
    expect(snapped).toEqual({ x: 4, y: 4 })
  })

  it('snaps to the nearest 45° angle when close enough and no point candidate is near', () => {
    // dragging from (5,1) almost due right (tiny y offset) should snap flush to 0°
    const snapped = snapInteriorWallEndpoint(room, wall, 5, 1, 8, 1.2)
    expect(snapped.y).toBeCloseTo(1)
  })

  it('leaves the raw point alone when neither a snap point nor a snap angle is close', () => {
    const rawX = 3.3
    const rawY = 5.7
    const snapped = snapInteriorWallEndpoint(room, wall, 5, 1, rawX, rawY)
    expect(snapped).toEqual({ x: rawX, y: rawY })
  })
})

describe('computeWallEndpointMove', () => {
  const room = { width: 10, height: 8, interiorWalls: [] }

  it("clamps the raw pointer to the room's bounds before snapping/returning", () => {
    const wall = { id: 'w1', x1: 5, y1: 5, x2: 5, y2: 7 }
    const { x, y } = computeWallEndpointMove(room, wall, 'a', -100, 100)
    expect(x).toBeGreaterThanOrEqual(0)
    expect(y).toBeLessThanOrEqual(room.height)
  })

  it('enforces the minimum wall length by walking back along the drag angle', () => {
    const wall = { id: 'w1', x1: 5, y1: 5, x2: 5, y2: 5.05 } // endpoint 'a' dragged almost onto 'b'
    const { x, y, updates } = computeWallEndpointMove(room, wall, 'a', 5, 5.02)
    const length = Math.hypot(x - wall.x2, y - wall.y2)
    expect(length).toBeCloseTo(MIN_INTERIOR_WALL_LENGTH)
    expect(updates).toEqual({ x1: x, y1: y })
  })

  it("returns x2/y2 updates for endpoint 'b', measuring the minimum length against x1/y1", () => {
    const wall = { id: 'w1', x1: 5, y1: 5, x2: 5, y2: 5.05 }
    const { updates } = computeWallEndpointMove(room, wall, 'b', 5, 5.02)
    expect(updates).toHaveProperty('x2')
    expect(updates).toHaveProperty('y2')
    expect(updates).not.toHaveProperty('x1')
  })

  it('passes an unobstructed drag straight through unchanged', () => {
    const wall = { id: 'w1', x1: 1, y1: 1, x2: 5, y2: 1 }
    const { x, y } = computeWallEndpointMove(room, wall, 'b', 3.3, 5.7)
    expect(x).toBeCloseTo(3.3)
    expect(y).toBeCloseTo(5.7)
  })
})

describe('roomsInMarquee', () => {
  const SCALE = 20
  const PADDING = 40
  const rooms = [
    { id: 1, x: 0, y: 0, width: 5, height: 5 },
    { id: 2, x: 10, y: 10, width: 5, height: 5 },
    { id: 3, x: 20, y: 0, width: 5, height: 5 },
  ]

  function roomPixelBox(room) {
    return {
      x1: room.x * SCALE + PADDING,
      y1: room.y * SCALE + PADDING,
      x2: (room.x + room.width) * SCALE + PADDING,
      y2: (room.y + room.height) * SCALE + PADDING,
    }
  }

  it('selects only rooms whose box overlaps the marquee', () => {
    const box1 = roomPixelBox(rooms[0])
    const box2 = roomPixelBox(rooms[1])
    // a marquee spanning from inside room 1 to inside room 2, missing room 3 entirely
    const marquee = { x1: box1.x1 + 5, y1: box1.y1 + 5, x2: box2.x2 - 5, y2: box2.y2 - 5 }

    expect(roomsInMarquee(rooms, marquee, SCALE, PADDING).sort()).toEqual([1, 2])
  })

  it('returns an empty list when the marquee touches nothing', () => {
    const marquee = { x1: 5000, y1: 5000, x2: 5100, y2: 5100 }
    expect(roomsInMarquee(rooms, marquee, SCALE, PADDING)).toEqual([])
  })

  it('works regardless of which corner of the marquee was dragged first', () => {
    const box1 = roomPixelBox(rooms[0])
    // dragged from bottom-right to top-left (x2/y2 < x1/y1) — min/max must still be handled
    const marquee = { x1: box1.x2 + 5, y1: box1.y2 + 5, x2: box1.x1 - 5, y2: box1.y1 - 5 }
    expect(roomsInMarquee(rooms, marquee, SCALE, PADDING)).toEqual([1])
  })
})
