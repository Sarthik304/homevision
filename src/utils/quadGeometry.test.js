import { describe, expect, it } from 'vitest'
import { clampAndSnapQuadCorner } from './quadGeometry'

describe('clampAndSnapQuadCorner', () => {
  it('clamps a corner dragged outside the bounding box', () => {
    expect(clampAndSnapQuadCorner(8, 6, -3, 20)).toEqual({ x: 0, y: 6 })
  })

  it('snaps to the nearest edge midpoint when close enough (e.g. dragging toward a rhombus)', () => {
    expect(clampAndSnapQuadCorner(8, 6, 4.1, 0.1)).toEqual({ x: 4, y: 0 })
  })

  it('snaps to the center when close enough', () => {
    expect(clampAndSnapQuadCorner(8, 6, 4.2, 3.1)).toEqual({ x: 4, y: 3 })
  })

  it('snaps to the nearest box corner when close enough', () => {
    expect(clampAndSnapQuadCorner(8, 6, 0.2, 0.2)).toEqual({ x: 0, y: 0 })
  })

  it('leaves the point where it is when far from every snap target', () => {
    expect(clampAndSnapQuadCorner(8, 6, 2, 4.5)).toEqual({ x: 2, y: 4.5 })
  })
})
