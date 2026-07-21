import useHouseStore from '../../store/useHouseStore'

// Navbar sits at the top of the screen.
// The most important thing it does is let you switch between 2D and 3D view.

export default function Navbar() {
  const { activeView, setActiveView } = useHouseStore()

  return (
    <div
      style={{
        height: 52,
        background: '#13131f',
        borderBottom: '1px solid #2a2a3e',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 16,
        flexShrink: 0,
      }}
    >
      {/* App name */}
      <div style={{ fontSize: 16, fontWeight: 700, color: '#60a5fa', marginRight: 12 }}>
        HomeVision
      </div>

      {/* View toggle */}
      <div
        style={{
          display: 'flex',
          background: '#2a2a3e',
          borderRadius: 8,
          padding: 3,
          gap: 2,
        }}
      >
        {['2d', '3d'].map((view) => (
          <button
            key={view}
            onClick={() => setActiveView(view)}
            style={{
              padding: '5px 16px',
              borderRadius: 6,
              border: 'none',
              background: activeView === view ? '#2563eb' : 'transparent',
              color: activeView === view ? '#fff' : '#888',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              transition: 'all 0.15s',
            }}
          >
            {view === '2d' ? '2D Plan' : '3D View'}
          </button>
        ))}
      </div>

      {/* Tip text */}
      <div style={{ fontSize: 12, color: '#555', marginLeft: 'auto' }}>
        {activeView === '3d'
          ? 'Drag to rotate · Scroll to zoom · Right-click to pan'
          : 'Click a room to select · Drag to reposition'}
      </div>
    </div>
  )
}
