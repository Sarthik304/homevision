import { describe, expect, it } from 'vitest'
import { getLEdges, getLPolygon, getWallKeys, isLShape, L_WALL_KEYS, RECT_WALL_KEYS } from './lshape'

describe('getLEdges', () => {
  it('walks the 6 edges clockwise from the top-left corner around the top-right notch', () => {
    const edges = getLEdges(10, 8, 4, 3)
    expect(edges.map((e) => e.key)).toEqual(['top', 'notchV', 'notchH', 'right', 'bottom', 'left'])
    expect(edges).toEqual([
      { key: 'top', from: { x: 0, y: 0 }, to: { x: 6, y: 0 } },
      { key: 'notchV', from: { x: 6, y: 0 }, to: { x: 6, y: 3 } },
      { key: 'notchH', from: { x: 6, y: 3 }, to: { x: 10, y: 3 } },
      { key: 'right', from: { x: 10, y: 3 }, to: { x: 10, y: 8 } },
      { key: 'bottom', from: { x: 10, y: 8 }, to: { x: 0, y: 8 } },
      { key: 'left', from: { x: 0, y: 8 }, to: { x: 0, y: 0 } },
    ])
  })

  it('forms a closed loop — each edge starts where the previous one ended', () => {
    const edges = getLEdges(10, 8, 4, 3)
    edges.forEach((edge, i) => {
      const prev = edges[(i - 1 + edges.length) % edges.length]
      expect(edge.from).toEqual(prev.to)
    })
  })

  it('clamps an oversized notch to the room bounds instead of producing a negative edge', () => {
    const edges = getLEdges(10, 8, 999, 999)
    const byKey = Object.fromEntries(edges.map((e) => [e.key, e]))
    expect(byKey.notchV.from.x).toBe(0)
    expect(byKey.notchH.to.x).toBe(10)
  })
})

describe('getLPolygon', () => {
  it('is just the "from" point of each edge, in order', () => {
    const edges = getLEdges(10, 8, 4, 3)
    expect(getLPolygon(10, 8, 4, 3)).toEqual(edges.map((e) => e.from))
  })
})

describe('getWallKeys / isLShape', () => {
  it('returns the L-shape keys for an L room, rect keys otherwise', () => {
    expect(isLShape({ shape: 'L' })).toBe(true)
    expect(isLShape({ shape: 'rect' })).toBe(false)
    expect(getWallKeys({ shape: 'L' })).toBe(L_WALL_KEYS)
    expect(getWallKeys({ shape: 'rect' })).toBe(RECT_WALL_KEYS)
  })
})
