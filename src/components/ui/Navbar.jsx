import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import useHouseStore from '../../store/useHouseStore'
import useAuthStore from '../../store/useAuthStore'
import useDesignsStore from '../../store/useDesignsStore'
import AuthModal from '../auth/AuthModal'
import DesignsPanel from '../auth/DesignsPanel'
import OpenDesignModal from './OpenDesignModal'
import { getColors, radius } from '../../theme'
import { shareLinkFor } from '../../utils/shareLink'

export default function Navbar() {
  const { activeView, setActiveView, darkMode, toggleDarkMode, unit, toggleUnit } = useHouseStore(
    useShallow((s) => ({
      activeView: s.activeView,
      setActiveView: s.setActiveView,
      darkMode: s.darkMode,
      toggleDarkMode: s.toggleDarkMode,
      unit: s.unit,
      toggleUnit: s.toggleUnit,
    }))
  )
  const { user, initializing, signOut } = useAuthStore(
    useShallow((s) => ({ user: s.user, initializing: s.initializing, signOut: s.signOut }))
  )
  const { activeDesignId, designs, fetchDesigns } = useDesignsStore(
    useShallow((s) => ({ activeDesignId: s.activeDesignId, designs: s.designs, fetchDesigns: s.fetchDesigns }))
  )
  const color = getColors(darkMode)
  const [modal, setModal] = useState(null) // null | 'auth' | 'designs' | 'open-design'

  // fetches designs so "Open share link" knows the active design's public status after sign-in
  useEffect(() => {
    if (user) fetchDesigns(user.id)
  }, [user, fetchDesigns])

  const activeDesignIsPublic = designs.find((d) => d.id === activeDesignId)?.is_public ?? false

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
              className="pixel-btn"
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
        className="pixel-btn"
        onClick={toggleUnit}
        title="Toggle measurement unit"
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
        {unit === 'ft' ? 'Feet' : 'Meters'}
      </button>

      <button
        className="pixel-btn"
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

      <button
        className="pixel-btn"
        onClick={() => setModal('open-design')}
        title="Open a design from its shared link"
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
        Open design
      </button>

      {!initializing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user ? (
            <>
              <span style={{ fontSize: 12, color: color.muted, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </span>
              {activeDesignIsPublic && (
                <button
                  className="pixel-btn"
                  onClick={() => window.open(shareLinkFor(activeDesignId), '_blank', 'noopener')}
                  title="Open this design's shareable link in a new tab"
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
                  🔗 Open share link
                </button>
              )}
              <button
                className="pixel-btn"
                onClick={() => setModal('designs')}
                style={{
                  padding: '6px 12px',
                  borderRadius: radius.sm,
                  border: `1px solid ${color.brand}`,
                  background: color.brandTint,
                  color: color.brand,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                My designs
              </button>
              <button
                className="pixel-btn"
                onClick={signOut}
                title="Sign out"
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
                Sign out
              </button>
            </>
          ) : (
            <button
              className="pixel-btn"
              onClick={() => setModal('auth')}
              style={{
                padding: '6px 14px',
                borderRadius: radius.sm,
                border: `1px solid ${color.brand}`,
                background: color.brand,
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              Sign in
            </button>
          )}
        </div>
      )}

      {modal === 'auth' && <AuthModal onClose={() => setModal(null)} color={color} />}
      {modal === 'designs' && user && <DesignsPanel onClose={() => setModal(null)} color={color} />}
      {modal === 'open-design' && <OpenDesignModal onClose={() => setModal(null)} color={color} />}
    </div>
  )
}
