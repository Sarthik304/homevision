import useHouseStore from '../../store/useHouseStore'
import { color, radius } from '../../theme'

export default function Navbar() {
  const { activeView, setActiveView } = useHouseStore()

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
          fontSize: 16,
          fontWeight: 700,
          color: color.text,
          letterSpacing: -0.2,
          marginRight: 12,
        }}
      >
        HomeVision
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
    </div>
  )
}
