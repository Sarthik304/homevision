import { describe, expect, it } from 'vitest'
import {
  feetToMeters,
  formatLength,
  fromDisplayLength,
  metersToFeet,
  roundDisplayLength,
  toDisplayLength,
} from './units'

describe('metersToFeet / feetToMeters', () => {
  it('round-trips', () => {
    expect(feetToMeters(metersToFeet(12))).toBeCloseTo(12)
  })

  it('1 meter is ~3.28 feet', () => {
    expect(metersToFeet(1)).toBeCloseTo(3.2808, 3)
  })

  it('1 foot is exactly 0.3048 meters', () => {
    expect(feetToMeters(1)).toBeCloseTo(0.3048)
  })
})

describe('toDisplayLength / fromDisplayLength', () => {
  it("unit 'm' passes the value through unchanged", () => {
    expect(toDisplayLength(12, 'm')).toBe(12)
    expect(fromDisplayLength(12, 'm')).toBe(12)
  })

  it("unit 'ft' converts both directions", () => {
    expect(toDisplayLength(1, 'ft')).toBeCloseTo(3.2808, 3)
    expect(fromDisplayLength(3.2808, 'ft')).toBeCloseTo(1, 3)
  })

  it('round-trips through both conversions for a room-sized value', () => {
    const meters = 8.3
    expect(fromDisplayLength(toDisplayLength(meters, 'ft'), 'ft')).toBeCloseTo(meters)
  })
})

describe('roundDisplayLength', () => {
  it('rounds meters to 1 decimal', () => {
    expect(roundDisplayLength(12.345, 'm')).toBe(12.3)
  })

  it('rounds feet to 2 decimals', () => {
    // 12.345m -> 40.5019...ft
    expect(roundDisplayLength(12.345, 'ft')).toBe(40.5)
  })
})

describe('formatLength', () => {
  it('formats meters with a 1-decimal + unit suffix, no space', () => {
    expect(formatLength(12, 'm')).toBe('12.0m')
  })

  it('formats feet with a 2-decimal + unit suffix', () => {
    expect(formatLength(1, 'ft')).toBe('3.28ft')
  })
})
