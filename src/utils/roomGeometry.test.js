import { describe, expect, it } from 'vitest'
import { getRoomAABB, getSnappedPosition, rotateAround } from './roomGeometry'

describe('rotateAround', () => {
  it('rotates a point 90° clockwise around a center', () => {
    const { x, y } = rotateAround(10, 0, 0, 0, 90)
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(10)
  })

  it('leaves the point unchanged for a 0° rotation', () => {
    expect(rotateAround(5, 3, 1, 1, 0)).toEqual({ x: 5, y: 3 })
  })

  it('returns to the start after a full 360°', () => {
    const { x, y } = rotateAround(7, -2, 1, 1, 360)
    expect(x).toBeCloseTo(7)
    expect(y).toBeCloseTo(-2)
  })
})

describe('getRoomAABB', () => {
  const room = { x: 0, y: 0, width: 12, height: 6, rotation: 0 }

  it('matches the room bounds exactly at 0°', () => {
    expect(getRoomAABB(room)).toEqual({ x: 0, y: 0, width: 12, height: 6 })
  })

  it('swaps width/height at 90°, keeping the same center', () => {
    const aabb = getRoomAABB({ ...room, rotation: 90 })
    expect(aabb).toEqual({ x: 3, y: -3, width: 6, height: 12 })
  })

  it('swaps width/height at 270° the same way as 90°', () => {
    expect(getRoomAABB({ ...room, rotation: 270 })).toEqual(getRoomAABB({ ...room, rotation: 90 }))
  })

  it('does not swap at 180° (same footprint as 0°)', () => {
    expect(getRoomAABB({ ...room, rotation: 180 })).toEqual(getRoomAABB(room))
  })

  it('normalizes a negative or >360 rotation before checking the 90° grid', () => {
    expect(getRoomAABB({ ...room, rotation: -90 })).toEqual(getRoomAABB({ ...room, rotation: 270 }))
    expect(getRoomAABB({ ...room, rotation: 450 })).toEqual(getRoomAABB({ ...room, rotation: 90 }))
  })

  it('opts out (null) for any rotation off the 90° grid', () => {
    expect(getRoomAABB({ ...room, rotation: 45 })).toBeNull()
    expect(getRoomAABB({ ...room, rotation: 30 })).toBeNull()
  })
})

describe('getSnappedPosition', () => {
  const room = { width: 4, height: 3 }
  const other = { x: 10, y: 0, width: 4, height: 3 }

  it('snaps a dragged room flush against a neighbor it overlaps and nearly touches', () => {
    // y is already flush (0 for both rooms), so this also happens to satisfy the corner-to-corner
    // check below — the point is just that x lands exactly on the shared edge
    const result = getSnappedPosition(room, [other], 6.05, 0)
    expect(result.xSnapped).toBe(true)
    expect(result.x).toBeCloseTo(6)
    expect(result.y).toBeCloseTo(0)
  })

  it('does not snap when far outside the threshold', () => {
    const result = getSnappedPosition(room, [other], 3, 0)
    expect(result.xSnapped).toBe(false)
    expect(result.x).toBe(3)
  })

  it('snaps corner-to-corner when two rooms only touch diagonally', () => {
    const diagonalOther = { x: 10, y: 10, width: 4, height: 3 } // bottom-right corner at (14, 13)
    const result = getSnappedPosition(room, [diagonalOther], 14.05, 13.05)
    expect(result.xSnapped).toBe(true)
    expect(result.ySnapped).toBe(true)
    expect(result.x).toBeCloseTo(14)
    expect(result.y).toBeCloseTo(13)
  })
})
