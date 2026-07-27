// Design tokens for the whole app.
//
// These are plain JS values on purpose. HomeVision draws through three engines
// that can't share a stylesheet — the DOM (inline styles), the Konva canvas
// (fill/stroke props) and three.js (material colors). Plain strings reach all
// three, CSS variables only reach the first.
//
// The palette follows IKEA's home planner: white and grey almost everywhere,
// hairline borders, and blue held back so it only ever marks the active thing.

export const color = {
  bg: '#FFFFFF',           // panels, navbar
  workspace: '#F7F7F7',    // 2D canvas + 3D background
  surface: '#F5F5F5',      // segmented-control track, row hover
  border: '#DFDFDF',       // hairline dividers
  borderInput: '#767676',  // IKEA inputs use a dark border
  text: '#111111',
  muted: '#767676',        // labels and hints — passes AA on white
  brand: '#0058A3',        // IKEA blue — active state only
  brandTint: '#F0F5FA',    // selected row background
  danger: '#E00751',
  ceiling: '#FAFAFA',
  gridCell: '#E8E8E8',
  gridSection: '#D4D4D4',
}

// Noto Sans is IKEA's brand typeface. Loaded in index.html; the system stack
// stays behind it so nothing breaks if the font doesn't arrive.
export const font =
  "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export const radius = { sm: 4, md: 8, pill: 999 }
