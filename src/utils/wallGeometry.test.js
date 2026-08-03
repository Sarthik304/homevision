import { describe, expect, it } from 'vitest'
import { getLEdges } from '../constants/lshape'
import { getLWallDefs, WALL_THICKNESS } from './wallGeometry'

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
})
