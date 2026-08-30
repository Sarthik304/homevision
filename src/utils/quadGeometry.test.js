import { describe, expect, it } from 'vitest'
import { snapQuadCorner } from './quadGeometry'

describe('snapQuadCorner', () => {
  it('allows a corner to be dragged outside the bounding box (stretching a point outward)', () => {
    expect(snapQuadCorner(8, 6, -3, 20)).toEqual({ x: -3, y: 20 })
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

  it('leaves the point where it is when far from every snap target, inside or outside the box', () => {
    expect(snapQuadCorner(8, 6, 2, 4.5)).toEqual({ x: 2, y: 4.5 })
    expect(snapQuadCorner(8, 6, 12, -5)).toEqual({ x: 12, y: -5 })
  })
})
