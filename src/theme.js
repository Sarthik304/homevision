export const lightColors = {
  bg: '#FFFFFF',
  workspace: '#F7F7F7',
  surface: '#F5F5F5',
  border: '#DFDFDF',
  borderInput: '#767676',
  text: '#111111',
  muted: '#767676',
  brand: '#0058A3',
  brandTint: '#F0F5FA',
  danger: '#E00751',
  ceiling: '#FAFAFA',
  gridCell: '#E8E8E8',
  gridSection: '#D4D4D4',
  window: '#8ecae6',
  glass: '#bfe3f0',
}

export const darkColors = {
  bg: '#1B1B1F',
  workspace: '#121214',
  surface: '#26262B',
  border: '#33333A',
  borderInput: '#55555C',
  text: '#F2F2F2',
  muted: '#9A9AA2',
  brand: '#4C9AE8',
  brandTint: '#1E2A38',
  danger: '#FF6B8B',
  ceiling: '#2A2A30',
  gridCell: '#26262B',
  gridSection: '#38383F',
  window: '#5fb4dd',
  glass: '#3a5f70',
}

export function getColors(darkMode) {
  return darkMode ? darkColors : lightColors
}

// Backwards-compatible default palette.
export const color = lightColors

export const font =
  "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export const radius = { sm: 4, md: 8, pill: 999 }
