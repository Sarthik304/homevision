// Display-only length conversion — geometry is always stored in meters (see useHouseStore).
export const METERS_PER_FOOT = 0.3048

export function metersToFeet(meters) {
  return meters / METERS_PER_FOOT
}

export function feetToMeters(feet) {
  return feet * METERS_PER_FOOT
}

// meters -> plain number in the given display unit
export function toDisplayLength(meters, unit) {
  return unit === 'ft' ? metersToFeet(meters) : meters
}

// display-unit number -> meters, for storing
export function fromDisplayLength(value, unit) {
  return unit === 'ft' ? feetToMeters(value) : value
}

// rounds a display-unit number for showing in a controlled input
export function roundDisplayLength(meters, unit) {
  const decimals = unit === 'ft' ? 2 : 1
  const factor = 10 ** decimals
  return Math.round(toDisplayLength(meters, unit) * factor) / factor
}

// formats a meters value as a display string with its unit suffix, e.g. "12.0m" / "39.37ft"
export function formatLength(meters, unit) {
  const decimals = unit === 'ft' ? 2 : 1
  return `${roundDisplayLength(meters, unit).toFixed(decimals)}${unit}`
}
