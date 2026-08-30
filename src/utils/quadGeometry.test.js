import { describe, expect, it } from 'vitest'
import { getRoomWorldPolygon, snapQuadCorner, snapToOtherRooms } from './quadGeometry'

describe('snapQuadCorner', () => {
  it('allows a corner to be dragged outside the bounding box (stretching a point outward)', () => {
    expect(snapQuadCorner(8, 6, -3, 20)).toBeNull()
  })

  it('snaps to the nearest edge midpoint when close enough (e.g. dragging toward a rhombus)', () => {
    expect(snapQuadCorner(8, 6, 4.1, 0.1)).toEqual({ x: 4, y: 0 })
  })

  it('snaps to the center when close enough', () => {
    expect(snapQuadCorner(8, 6, 4.2, 3.1)).toEqual({ x: 4, y: 3 })
  })

  it('snaps to the nearest box corner when close enough', () => {
    expect(snapQuadCorner(8, 6, 0.2, 0.2)).toEqual({ x: 0, y: 0 })
  })

  it('returns null when far from every snap target, inside or outside the box', () => {
    expect(snapQuadCorner(8, 6, 2, 4.5)).toBeNull()
    expect(snapQuadCorner(8, 6, 12, -5)).toBeNull()
  })
})

describe('getRoomWorldPolygon', () => {
  it("returns a plain rect's 4 world corners", () => {
    const room = { x: 2, y: 3, width: 4, height: 5, shape: 'rect' }
    expect(getRoomWorldPolygon(room)).toEqual([
      { x: 2, y: 3 },
      { x: 6, y: 3 },
      { x: 6, y: 8 },
      { x: 2, y: 8 },
    ])
  })

  it("accounts for the room's own rotation", () => {
    // a 2x2 room at the origin, rotated 90° clockwise — its corners swap around the center (1,1)
    const room = { x: 0, y: 0, width: 2, height: 2, shape: 'rect', rotation: 90 }
    const polygon = getRoomWorldPolygon(room)
    expect(polygon[0].x).toBeCloseTo(2)
    expect(polygon[0].y).toBeCloseTo(0)
  })

  it("returns a quad room's actual skewed corners, not its bounding box", () => {
    const room = {
      x: 0,
      y: 0,
      width: 8,
      height: 8,
      shape: 'quad',
      corners: { tl: { x: 4, y: 0 }, tr: { x: 8, y: 0 }, br: { x: 8, y: 8 }, bl: { x: 0, y: 8 } },
    }
    expect(getRoomWorldPolygon(room)).toEqual([
      { x: 4, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 8 },
      { x: 0, y: 8 },
    ])
  })
})

describe('snapToOtherRooms', () => {
  // a real gap between the two (not flush) so a point near their facing edges isn't equidistant
  // from both rooms' geometry — keeps each case's nearest candidate unambiguous
  const rooms = [
    { id: 1, x: 0, y: 0, width: 10, height: 10, shape: 'rect' },
    { id: 2, x: 15, y: 0, width: 10, height: 10, shape: 'rect' },
  ]

  it("snaps to a neighboring room's corner when close enough", () => {
    // diagonally outside the corner, so both adjacent sides clamp to the same corner point
    // (a point like (15.1, 0.1) instead would be ambiguous — equidistant from each side)
    expect(snapToOtherRooms(rooms, 3, { x: 14.9, y: -0.1 })).toEqual({ x: 15, y: 0 })
  })

  it("snaps to the nearest point on a neighboring room's side, not just its corners", () => {
    // (15, 5) isn't a corner of room 2, but it's the midpoint of its left side (15,0)-(15,10)
    expect(snapToOtherRooms(rooms, 3, { x: 15.1, y: 5 })).toEqual({ x: 15, y: 5 })
  })

  it('excludes the room being dragged from its own candidate list', () => {
    // dragging room 1's own corner shouldn't snap to itself
    expect(snapToOtherRooms(rooms, 1, { x: 0.1, y: 0.1 })).toBeNull()
  })

  it('returns null when no other room is close enough', () => {
    expect(snapToOtherRooms(rooms, 3, { x: 50, y: 50 })).toBeNull()
  })
})
