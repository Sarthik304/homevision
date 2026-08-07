// Display-only length conversion. Room geometry is always stored in meters (see useHouseStore) —
// these helpers only convert at the UI boundary: formatting a stored value for display, and
// parsing a typed value back into meters before it's stored.
export const METERS_PER_FOOT = 0.3048

export function metersToFeet(meters) {
  return meters / METERS_PER_FOOT
}

export function feetToMeters(feet) {
  return feet * METERS_PER_FOOT
}

// a stored meters value -> a plain number in the given display unit
export function toDisplayLength(meters, unit) {
  return unit === 'ft' ? metersToFeet(meters) : meters
}

// a number typed in the given display unit -> meters, for storing
export function fromDisplayLength(value, unit) {
  return unit === 'ft' ? feetToMeters(value) : value
}

// rounds a display-unit number for showing in a controlled input — feet gets one more decimal
// than meters since a tenth of a foot (~3cm) is coarser than a tenth of a meter
export function roundDisplayLength(meters, unit) {
  const decimals = unit === 'ft' ? 2 : 1
  const factor = 10 ** decimals
  return Math.round(toDisplayLength(meters, unit) * factor) / factor
}

// formats a stored meters value as a display string with its unit suffix, e.g. "12.0m" / "39.37ft"
export function formatLength(meters, unit) {
  const decimals = unit === 'ft' ? 2 : 1
  return `${roundDisplayLength(meters, unit).toFixed(decimals)}${unit}`
}
