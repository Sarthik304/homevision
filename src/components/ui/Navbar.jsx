import { useShallow } from 'zustand/react/shallow'
import useHouseStore from '../../store/useHouseStore'
import { getColors, radius } from '../../theme'

export default function Navbar() {
  // useShallow subscribes only to these fields (shallow-compared), instead of re-rendering the
  // navbar on every store change (e.g. a room being dragged in the 2D view)
  const { activeView, setActiveView, darkMode, toggleDarkMode } = useHouseStore(
    useShallow((s) => ({
      activeView: s.activeView,
      setActiveView: s.setActiveView,
      darkMode: s.darkMode,
      toggleDarkMode: s.toggleDarkMode,
    }))
  )
  const color = getColors(darkMode)

  return (
    <div
      style={{
        height: 56,
        background: color.bg,
        borderBottom: `1px solid ${color.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginRight: 12,
        }}
      >
        <img src="/favicon.svg" alt="" width={28} height={28} style={{ display: 'block', objectFit: 'contain' }} />
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: color.text,
            letterSpacing: -0.2,
          }}
        >
          HomeVision
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          background: color.surface,
          borderRadius: radius.md,
          padding: 3,
          gap: 2,
        }}
      >
        {['2d', '3d'].map((view) => {
          const isActive = activeView === view
          return (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              style={{
                padding: '5px 16px',
                borderRadius: radius.sm + 1,
                border: isActive ? `1px solid ${color.border}` : '1px solid transparent',
                background: isActive ? color.bg : 'transparent',
                color: isActive ? color.brand : color.muted,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                transition: 'all 0.15s',
              }}
            >
              {view === '2d' ? '2D Plan' : '3D View'}
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 12, color: color.muted, marginLeft: 'auto' }}>
        {activeView === '3d'
          ? 'Drag to rotate · Scroll to zoom · Right-click to pan'
          : 'Click a room to select · Drag to reposition'}
      </div>

      <button
        onClick={toggleDarkMode}
        title="Toggle dark mode"
        style={{
          padding: '6px 12px',
          borderRadius: radius.sm,
          border: `1px solid ${color.border}`,
          background: color.surface,
          color: color.text,
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {darkMode ? 'Light mode' : 'Dark mode'}
      </button>
    </div>
  )
}
