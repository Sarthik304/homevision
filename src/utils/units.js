// Display-only length conversion — geometry is always stored in meters (see useHouseStore).
export const METERS_PER_FOOT = 0.3048

export function metersToFeet(meters) {
  return meters / METERS_PER_FOOT
}

export function feetToMeters(feet) {
  return feet * METERS_PER_FOOT
}

// every selectable display unit: how many meters make up one of it, and how many decimals to show
export const UNIT_OPTIONS = [
  { key: 'm', label: 'Meters', metersPerUnit: 1, decimals: 1 },
  { key: 'cm', label: 'Centimeters', metersPerUnit: 0.01, decimals: 0 },
  { key: 'mm', label: 'Millimeters', metersPerUnit: 0.001, decimals: 0 },
  { key: 'ft', label: 'Feet', metersPerUnit: METERS_PER_FOOT, decimals: 2 },
  { key: 'in', label: 'Inches', metersPerUnit: METERS_PER_FOOT / 12, decimals: 1 },
]

const UNIT_BY_KEY = Object.fromEntries(UNIT_OPTIONS.map((u) => [u.key, u]))

// meters -> plain number in the given display unit
export function toDisplayLength(meters, unit) {
  return meters / UNIT_BY_KEY[unit].metersPerUnit
}

// display-unit number -> meters, for storing
export function fromDisplayLength(value, unit) {
  return value * UNIT_BY_KEY[unit].metersPerUnit
}

// rounds a display-unit number for showing in a controlled input
export function roundDisplayLength(meters, unit) {
  const factor = 10 ** UNIT_BY_KEY[unit].decimals
  return Math.round(toDisplayLength(meters, unit) * factor) / factor
}

// formats a meters value as a display string with its unit suffix, e.g. "12.0m" / "39.37ft"
export function formatLength(meters, unit) {
  const decimals = UNIT_BY_KEY[unit].decimals
  return `${roundDisplayLength(meters, unit).toFixed(decimals)}${unit}`
}
