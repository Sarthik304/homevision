import { describe, expect, it } from 'vitest'
import {
  defaultQuadCorners,
  getQuadEdges,
  getQuadPolygon,
  quadCornersOf,
  rescaleQuadCorners,
} from './quad'

describe('defaultQuadCorners', () => {
  it('inscribes a plain rectangle in the bounding box', () => {
    expect(defaultQuadCorners(8, 6)).toEqual({
      tl: { x: 0, y: 0 },
      tr: { x: 8, y: 0 },
      br: { x: 8, y: 6 },
      bl: { x: 0, y: 6 },
    })
  })
})

describe('quadCornersOf', () => {
  it("returns the room's corners when present", () => {
    const corners = defaultQuadCorners(4, 4)
    expect(quadCornersOf({ width: 4, height: 4, corners })).toBe(corners)
  })

  it('falls back to a plain rectangle when corners are missing', () => {
    expect(quadCornersOf({ width: 4, height: 2 })).toEqual(defaultQuadCorners(4, 2))
  })
})

describe('getQuadEdges', () => {
  it('walks the 4 edges clockwise from top-left, keyed like a rectangle', () => {
    const corners = defaultQuadCorners(8, 6)
    const edges = getQuadEdges(corners)
    expect(edges.map((e) => e.key)).toEqual(['top', 'right', 'bottom', 'left'])
    expect(edges[0]).toEqual({ key: 'top', from: corners.tl, to: corners.tr })
    expect(edges[2]).toEqual({ key: 'bottom', from: corners.br, to: corners.bl })
  })
})

describe('getQuadPolygon', () => {
  it('returns the 4 corners in tl/tr/br/bl order', () => {
    const corners = defaultQuadCorners(8, 6)
    expect(getQuadPolygon(corners)).toEqual([corners.tl, corners.tr, corners.br, corners.bl])
  })
})

describe('rescaleQuadCorners', () => {
  it('scales corner offsets proportionally with the box', () => {
    const corners = { tl: { x: 2, y: 0 }, tr: { x: 8, y: 0 }, br: { x: 8, y: 8 }, bl: { x: 0, y: 8 } }
    const rescaled = rescaleQuadCorners(corners, 8, 8, 16, 4)
    expect(rescaled.tl).toEqual({ x: 4, y: 0 })
    expect(rescaled.br).toEqual({ x: 16, y: 4 })
  })

  it('is a no-op when the box size is unchanged', () => {
    const corners = defaultQuadCorners(8, 6)
    expect(rescaleQuadCorners(corners, 8, 6, 8, 6)).toEqual(corners)
  })
})
