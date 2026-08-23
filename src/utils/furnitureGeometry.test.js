import { describe, expect, it } from 'vitest'
import { MIN_FURNITURE_SIZE, resizeFurnitureCorner } from './furnitureGeometry'

describe('resizeFurnitureCorner', () => {
  const room = { width: 10, height: 8 }
  const item = { x: 2, y: 2, width: 2, depth: 1.5 }

  it('dragging the bottom-right corner grows width/depth, keeping the top-left fixed', () => {
    const result = resizeFurnitureCorner(item, 'br', 5, 4, room.width, room.height)
    expect(result).toEqual({ x: 2, y: 2, width: 3, depth: 2 })
  })

  it('dragging the top-left corner moves x/y and shrinks toward the fixed bottom-right', () => {
    const result = resizeFurnitureCorner(item, 'tl', 3, 3, room.width, room.height)
    expect(result).toEqual({ x: 3, y: 3, width: 1, depth: 0.5 })
  })

  it('dragging the top-right corner only moves the top edge and right edge', () => {
    const result = resizeFurnitureCorner(item, 'tr', 5, 1.5, room.width, room.height)
    expect(result.x).toBe(2) // left edge untouched
    expect(result.width).toBeCloseTo(3)
    expect(result.y).toBeCloseTo(1.5)
    expect(result.depth).toBeCloseTo(2)
  })

  it('dragging the bottom-left corner only moves the left edge and bottom edge', () => {
    const result = resizeFurnitureCorner(item, 'bl', 1, 4, room.width, room.height)
    expect(result.x).toBeCloseTo(1)
    expect(result.width).toBeCloseTo(3)
    expect(result.y).toBe(2) // top edge untouched
    expect(result.depth).toBeCloseTo(2)
  })

  it('never shrinks below MIN_FURNITURE_SIZE, even when dragged past the opposite edge', () => {
    const result = resizeFurnitureCorner(item, 'br', 2, 2, room.width, room.height)
    expect(result.width).toBeCloseTo(MIN_FURNITURE_SIZE)
    expect(result.depth).toBeCloseTo(MIN_FURNITURE_SIZE)
  })

  it('clamps the dragged corner to the room bounds', () => {
    const result = resizeFurnitureCorner(item, 'br', 100, 100, room.width, room.height)
    expect(result.x + result.width).toBeCloseTo(room.width)
    expect(result.y + result.depth).toBeCloseTo(room.height)
  })

  it('clamps the dragged corner so it never goes below zero', () => {
    const result = resizeFurnitureCorner(item, 'tl', -100, -100, room.width, room.height)
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })
})
