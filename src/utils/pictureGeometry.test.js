import { describe, expect, it } from 'vitest'
import {
  MIN_PICTURE_SIZE,
  movePictureToPoint,
  pictureCenterX,
  pictureGrabOffset,
  pictureOppositeCorner,
  resizePictureToPoint,
} from './pictureGeometry'

describe('pictureCenterX', () => {
  it('converts the 0-1 offset convention into a wall-local center X', () => {
    expect(pictureCenterX({ offset: 0.5 }, 10)).toBe(0)
    expect(pictureCenterX({ offset: 0 }, 10)).toBe(-5)
    expect(pictureCenterX({ offset: 1 }, 10)).toBe(5)
  })
})

describe('pictureOppositeCorner', () => {
  const picture = { width: 2, height: 1, bottom: 1 }
  const centerX = 3 // so the picture spans x:[2,4], y:[1,2]

  it('picks the corner diagonally opposite the one being dragged', () => {
    expect(pictureOppositeCorner(picture, centerX, 'tl')).toEqual({ x: 4, y: 1 }) // br
    expect(pictureOppositeCorner(picture, centerX, 'tr')).toEqual({ x: 2, y: 1 }) // bl
    expect(pictureOppositeCorner(picture, centerX, 'bl')).toEqual({ x: 4, y: 2 }) // tr
    expect(pictureOppositeCorner(picture, centerX, 'br')).toEqual({ x: 2, y: 2 }) // tl
  })
})

describe('resizePictureToPoint', () => {
  const length = 10 // wall length, so offset math has room to move without clamping

  it('grows width/height to reach the dragged point, keeping the anchor fixed', () => {
    const anchor = { x: 2, y: 1 }
    const result = resizePictureToPoint(anchor, { x: 5, y: 3 }, length)
    expect(result.width).toBe(3)
    expect(result.height).toBe(2)
    expect(result.bottom).toBe(1) // anchor is the lower corner here
    // new center x = (2+5)/2 = 3.5 -> offset = (3.5 + length/2) / length
    expect(result.offset).toBeCloseTo((3.5 + 5) / 10)
  })

  it('works dragging past the anchor on either axis (corner flips through the anchor)', () => {
    const anchor = { x: 5, y: 5 }
    const result = resizePictureToPoint(anchor, { x: 2, y: 1 }, length)
    expect(result.width).toBe(3)
    expect(result.height).toBe(4)
    expect(result.bottom).toBe(1) // min(point.y, anchor.y)
  })

  it('floors width and height at MIN_PICTURE_SIZE instead of collapsing to zero', () => {
    const anchor = { x: 2, y: 1 }
    const result = resizePictureToPoint(anchor, { x: 2.001, y: 1.001 }, length)
    expect(result.width).toBe(MIN_PICTURE_SIZE)
    expect(result.height).toBe(MIN_PICTURE_SIZE)
  })

  it('never lets bottom drop below the floor', () => {
    const anchor = { x: 2, y: 0.5 }
    const result = resizePictureToPoint(anchor, { x: 4, y: -3 }, length)
    expect(result.bottom).toBe(0)
    expect(result.height).toBeCloseTo(3.5)
  })

  it('clamps offset to [0, 1] even if the dragged point goes past the wall end', () => {
    const anchor = { x: 4, y: 1 }
    const result = resizePictureToPoint(anchor, { x: 20, y: 2 }, length)
    expect(result.offset).toBe(1)
  })
})

describe('pictureGrabOffset', () => {
  it('is zero when grabbed exactly at center, and the click-to-center delta otherwise', () => {
    const picture = { width: 2, height: 1, bottom: 1 } // center y = 1.5
    expect(pictureGrabOffset(picture, 3, { x: 3, y: 1.5 })).toEqual({ x: 0, y: 0 })
    expect(pictureGrabOffset(picture, 3, { x: 3.5, y: 2 })).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('movePictureToPoint', () => {
  const length = 10
  const picture = { width: 2, height: 1, offset: 0.5, bottom: 1 } // center at (0, 1.5)

  it('keeps the same point under the cursor as when the drag started (grabOffset preserved)', () => {
    const grabOffset = { x: 0.5, y: 0.5 } // grabbed 0.5 right and 0.5 above center
    const result = movePictureToPoint({ x: 4.5, y: 3.5 }, grabOffset, picture, length)
    // new center = (4, 3) -> offset = (4+5)/10 = 0.9, bottom = 3 - height/2 = 2.5
    expect(result.offset).toBeCloseTo(0.9)
    expect(result.bottom).toBeCloseTo(2.5)
  })

  it('never lets the picture drop below the floor', () => {
    const result = movePictureToPoint({ x: 0, y: -5 }, { x: 0, y: 0 }, picture, length)
    expect(result.bottom).toBe(0)
  })

  it('clamps offset to [0, 1] past either end of the wall', () => {
    const zero = { x: 0, y: 0 }
    expect(movePictureToPoint({ x: -20, y: 2 }, zero, picture, length).offset).toBe(0)
    expect(movePictureToPoint({ x: 20, y: 2 }, zero, picture, length).offset).toBe(1)
  })

  it('leaves width and height untouched (only offset/bottom are returned)', () => {
    const result = movePictureToPoint({ x: 1, y: 2 }, { x: 0, y: 0 }, picture, length)
    expect(result).not.toHaveProperty('width')
    expect(result).not.toHaveProperty('height')
  })
})
