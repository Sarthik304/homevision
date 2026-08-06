import { describe, expect, it } from 'vitest'
import { getLEdges } from '../constants/lshape'
import { getLWallDefs, getRectWallDefs, WALL_THICKNESS } from './wallGeometry'

// Same rotation convention getLWallDefs relies on (three.js's RotationY matrix): every wall's
// rotation here is an exact multiple of 90° (since L-shape edges are always axis-aligned), so
// plain trig reproduces it exactly without needing to import three.js into a unit test.
function localToWorld(def, lx, lz) {
  const theta = def.rotation[1]
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  return {
    x: lx * cos + lz * sin + def.position[0],
    z: -lx * sin + lz * cos + def.position[2],
  }
}

function footprintAABB(def) {
  const half = WALL_THICKNESS / 2
  const xs = []
  const zs = []
  ;[def.trimStart, def.length - def.trimEnd].forEach((lx) => {
    ;[-half, half].forEach((lz) => {
      const { x, z } = localToWorld(def, lx - def.length / 2, lz)
      xs.push(x)
      zs.push(z)
    })
  })
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) }
}

// two footprints "touch" if their AABBs overlap or share a boundary on both axes — a gap on
// either axis means the walls don't actually meet at that corner
function boxesTouch(a, b, eps = 1e-6) {
  const xOverlap = a.minX <= b.maxX + eps && b.minX <= a.maxX + eps
  const zOverlap = a.minZ <= b.maxZ + eps && b.minZ <= a.maxZ + eps
  return xOverlap && zOverlap
}

describe('getLWallDefs', () => {
  const width = 10
  const height = 8
  const notchWidth = 4
  const notchHeight = 3

  it('produces one wall def per L-shape edge, in the same order', () => {
    const edges = getLEdges(width, height, notchWidth, notchHeight)
    const defs = getLWallDefs(width, height, notchWidth, notchHeight)
    expect(defs.map((d) => d.key)).toEqual(edges.map((e) => e.key))
  })

  it('only trims vertical (x-constant) edges', () => {
    const defs = getLWallDefs(width, height, notchWidth, notchHeight)
    const byKey = Object.fromEntries(defs.map((d) => [d.key, d]))
    expect(byKey.top.trimStart).toBe(0)
    expect(byKey.top.trimEnd).toBe(0)
    expect(byKey.bottom.trimStart).toBe(0)
    expect(byKey.bottom.trimEnd).toBe(0)
    expect(byKey.notchH.trimStart).toBe(0)
    expect(byKey.notchH.trimEnd).toBe(0)
    expect(byKey.left.trimStart).toBe(WALL_THICKNESS)
    expect(byKey.left.trimEnd).toBe(WALL_THICKNESS)
    expect(byKey.right.trimStart).toBe(WALL_THICKNESS)
    expect(byKey.right.trimEnd).toBe(WALL_THICKNESS)
  })

  it("trims notchV's start (convex corner with top) but not its end (reflex corner with notchH)", () => {
    const defs = getLWallDefs(width, height, notchWidth, notchHeight)
    const notchV = defs.find((d) => d.key === 'notchV')
    expect(notchV.trimStart).toBe(WALL_THICKNESS)
    expect(notchV.trimEnd).toBe(0)
  })

  describe('every wall meets its neighbor with no gap', () => {
    const edges = getLEdges(width, height, notchWidth, notchHeight)
    const defs = getLWallDefs(width, height, notchWidth, notchHeight)
    const byKey = Object.fromEntries(defs.map((d) => [d.key, d]))

    it.each(edges.map((e, i) => [e.key, edges[(i + 1) % edges.length].key]))(
      '%s wall touches %s wall',
      (fromKey, toKey) => {
        expect(boxesTouch(footprintAABB(byKey[fromKey]), footprintAABB(byKey[toKey]))).toBe(true)
      }
    )
  })

  it('would leave a gap at the reflex corner if notchV were trimmed like every other vertical edge (guards against reverting the fix)', () => {
    const defs = getLWallDefs(width, height, notchWidth, notchHeight)
    const notchH = defs.find((d) => d.key === 'notchH')
    const buggyNotchV = { ...defs.find((d) => d.key === 'notchV'), trimEnd: WALL_THICKNESS }
    expect(boxesTouch(footprintAABB(buggyNotchV), footprintAABB(notchH))).toBe(false)
  })

  // a door/window's `offset` (0-1) must land on the same physical point in 2D (FloorPlanEditor,
  // which walks edge.from -> edge.to as offset goes 0 -> 1) and 3D (this wall def's local x-axis,
  // offset*length from the wall's start). Otherwise dragging a door in 2D moves it to the mirrored
  // spot in 3D — this caught top/notchH/bottom all being reversed before the atan2 sign fix.
  it('offset 0 lands on edge.from and offset 1 lands on edge.to, in both 2D and 3D', () => {
    const edges = getLEdges(width, height, notchWidth, notchHeight)
    const defs = getLWallDefs(width, height, notchWidth, notchHeight)
    edges.forEach((edge, i) => {
      const def = defs[i]
      const atOffset = (offset) => {
        const { x, z } = localToWorld(def, offset * def.length - def.length / 2, 0)
        return { x: x + width / 2, y: z + height / 2 }
      }
      // loose tolerance: position carries a WALL_INSET (0.05m) nudge along the wall's normal
      // that from/to don't have — plenty tight to still fail hard on an actual from/to swap
      const start = atOffset(0)
      const end = atOffset(1)
      expect(start.x).toBeCloseTo(edge.from.x, 0)
      expect(start.y).toBeCloseTo(edge.from.y, 0)
      expect(end.x).toBeCloseTo(edge.to.x, 0)
      expect(end.y).toBeCloseTo(edge.to.y, 0)
    })
  })
})

// getRectWallDefs is a second, independent hand-written implementation of the same idea as
// getLWallDefs above (see the file-level comment on why it isn't unified onto one code path) —
// its own parity test here is what would have caught the original top/left offset-reversal bug,
// and what stops a future edit to either implementation from silently drifting out of sync again.
describe('getRectWallDefs', () => {
  const width = 10
  const height = 8

  it('every wall meets its neighbor with no gap', () => {
    const defs = getRectWallDefs(width, height)
    const byKey = Object.fromEntries(defs.map((d) => [d.key, d]))
    const cycle = ['top', 'right', 'bottom', 'left']
    cycle.forEach((key, i) => {
      const nextKey = cycle[(i + 1) % cycle.length]
      expect(boxesTouch(footprintAABB(byKey[key]), footprintAABB(byKey[nextKey]))).toBe(true)
    })
  })

  // must match FloorPlanEditor's RoomWalls (2D): offset 0 is the left end for top/bottom walls
  // and the top end for left/right walls — this is exactly the convention that 'top' and 'left'
  // got backwards before the rotation fix (see Room3D.jsx's rect wallDefs / getRectWallDefs)
  it('offset 0/1 land on the same room-local points as the 2D editor, for every wall', () => {
    const expected = {
      top: { from: { x: 0, y: 0 }, to: { x: width, y: 0 } },
      bottom: { from: { x: 0, y: height }, to: { x: width, y: height } },
      left: { from: { x: 0, y: 0 }, to: { x: 0, y: height } },
      right: { from: { x: width, y: 0 }, to: { x: width, y: height } },
    }
    const defs = getRectWallDefs(width, height)
    defs.forEach((def) => {
      const { from, to } = expected[def.key]
      const atOffset = (offset) => {
        const { x, z } = localToWorld(def, offset * def.length - def.length / 2, 0)
        return { x: x + width / 2, y: z + height / 2 }
      }
      // loose tolerance: position carries a WALL_INSET (0.05m) nudge that from/to don't have —
      // plenty tight to still fail hard on an actual from/to swap
      const start = atOffset(0)
      const end = atOffset(1)
      expect(start.x).toBeCloseTo(from.x, 0)
      expect(start.y).toBeCloseTo(from.y, 0)
      expect(end.x).toBeCloseTo(to.x, 0)
      expect(end.y).toBeCloseTo(to.y, 0)
    })
  })
})
