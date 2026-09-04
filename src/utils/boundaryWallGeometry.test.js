import { describe, expect, it } from 'vitest'
import {
  MIN_BOUNDARY_WALL_LENGTH,
  getBoundaryWallLength,
  resizeQuadWall,
  resizeRectOrLWall,
} from './boundaryWallGeometry'

describe('getBoundaryWallLength', () => {
  it('reads width/height for a plain rect room', () => {
    const room = { x: 0, y: 0, width: 6, height: 4 }
    expect(getBoundaryWallLength(room, 'top')).toBe(6)
    expect(getBoundaryWallLength(room, 'bottom')).toBe(6)
    expect(getBoundaryWallLength(room, 'left')).toBe(4)
    expect(getBoundaryWallLength(room, 'right')).toBe(4)
  })

  it('accounts for the notch on an L-shaped room', () => {
    const room = { shape: 'L', x: 0, y: 0, width: 6, height: 4, notchWidth: 2, notchHeight: 1 }
    expect(getBoundaryWallLength(room, 'top')).toBe(4) // width - notchWidth
    expect(getBoundaryWallLength(room, 'notchV')).toBe(1) // notchHeight
    expect(getBoundaryWallLength(room, 'notchH')).toBe(2) // notchWidth
    expect(getBoundaryWallLength(room, 'right')).toBe(3) // height - notchHeight
    expect(getBoundaryWallLength(room, 'bottom')).toBe(6)
    expect(getBoundaryWallLength(room, 'left')).toBe(4)
  })

  it('reads a quad room edge length from its corners', () => {
    const room = { shape: 'quad', width: 4, height: 3, corners: { tl: { x: 0, y: 0 }, tr: { x: 4, y: 0 }, br: { x: 4, y: 3 }, bl: { x: 0, y: 4 } } }
    expect(getBoundaryWallLength(room, 'top')).toBe(4)
    expect(getBoundaryWallLength(room, 'left')).toBe(4) // bl(0,4) to tl(0,0)
  })
})

describe('resizeRectOrLWall (rect)', () => {
  const room = { x: 2, y: 3, width: 6, height: 4 }

  it('every wall grows width/height without ever moving (x, y)', () => {
    expect(resizeRectOrLWall(room, 'top', 8)).toEqual({ width: 8 })
    expect(resizeRectOrLWall(room, 'bottom', 8)).toEqual({ width: 8 })
    expect(resizeRectOrLWall(room, 'right', 5)).toEqual({ height: 5 })
    expect(resizeRectOrLWall(room, 'left', 5)).toEqual({ height: 5 })
  })

  it('clamps to MIN_ROOM_SIZE', () => {
    expect(resizeRectOrLWall(room, 'top', 0).width).toBe(1)
  })
})

describe('resizeRectOrLWall (L)', () => {
  const room = { shape: 'L', x: 0, y: 0, width: 6, height: 4, notchWidth: 2, notchHeight: 1 }

  it('top grows width, keeping notchWidth fixed', () => {
    expect(resizeRectOrLWall(room, 'top', 5)).toEqual({ width: 5 + 2 })
  })

  it('notchV sets notchHeight directly', () => {
    expect(resizeRectOrLWall(room, 'notchV', 2)).toEqual({ notchHeight: 2 })
  })

  it('notchH sets notchWidth and grows width to keep the top wall length fixed', () => {
    // top length was width-notchWidth = 4; setting notchH to 3 should keep that 4 and grow width to 7
    expect(resizeRectOrLWall(room, 'notchH', 3)).toEqual({ notchWidth: 3, width: 7 })
  })

  it('right grows height, keeping notchHeight fixed', () => {
    expect(resizeRectOrLWall(room, 'right', 4)).toEqual({ height: 4 + 1 })
  })

  it('bottom sets width directly without moving (x, y), floored by notchWidth', () => {
    expect(resizeRectOrLWall(room, 'bottom', 8)).toEqual({ width: 8 })
    expect(resizeRectOrLWall(room, 'bottom', 0).width).toBe(1 + 2) // MIN_ROOM_SIZE + notchWidth
  })

  it('left sets height directly without moving (x, y), floored by notchHeight', () => {
    expect(resizeRectOrLWall(room, 'left', 5)).toEqual({ height: 5 })
    expect(resizeRectOrLWall(room, 'left', 0).height).toBe(1 + 1) // MIN_ROOM_SIZE + notchHeight
  })
})

describe('resizeQuadWall', () => {
  const room = {
    shape: 'quad',
    width: 4,
    height: 3,
    corners: { tl: { x: 0, y: 0 }, tr: { x: 4, y: 0 }, br: { x: 4, y: 3 }, bl: { x: 0, y: 3 } },
  }

  it('moves the far corner outward along the wall angle, keeping the near corner fixed', () => {
    const { cornerKey, point } = resizeQuadWall(room, 'top', 6)
    expect(cornerKey).toBe('tr')
    expect(point).toEqual({ x: 6, y: 0 }) // tl stays at (0,0), tr slides out to length 6
  })

  it('can shrink a wall as well as stretch it', () => {
    const { cornerKey, point } = resizeQuadWall(room, 'right', 1)
    expect(cornerKey).toBe('br')
    expect(point).toEqual({ x: 4, y: 1 }) // tr stays at (4,0)
  })

  it('works on a non-axis-aligned edge, preserving its angle', () => {
    const skewed = { shape: 'quad', width: 4, height: 3, corners: { tl: { x: 0, y: 0 }, tr: { x: 3, y: 4 }, br: { x: 4, y: 3 }, bl: { x: 0, y: 3 } } }
    const { cornerKey, point } = resizeQuadWall(skewed, 'top', 10)
    expect(cornerKey).toBe('tr')
    // original tl->tr direction is (3,4)/5, scaled out to length 10
    expect(point.x).toBeCloseTo(6)
    expect(point.y).toBeCloseTo(8)
  })

  it('floors at MIN_BOUNDARY_WALL_LENGTH instead of collapsing to zero', () => {
    const { point } = resizeQuadWall(room, 'top', 0)
    expect(point.x).toBeCloseTo(MIN_BOUNDARY_WALL_LENGTH)
  })
})
