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
import useIsMobile from '../../hooks/useIsMobile'

const secondaryBtnStyle = (color) => ({
  padding: '6px 12px',
  borderRadius: radius.sm,
  border: `1px solid ${color.border}`,
  background: color.surface,
  color: color.text,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
})

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
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const secondaryBtn = secondaryBtnStyle(color)

  // fetches designs so "Open share link" knows the active design's public status after sign-in
  useEffect(() => {
    if (user) fetchDesigns(user.id)
  }, [user, fetchDesigns])

  // close the overflow menu whenever the viewport grows back to desktop width
  useEffect(() => {
    if (!isMobile) setMenuOpen(false)
  }, [isMobile])

  const activeDesignIsPublic = designs.find((d) => d.id === activeDesignId)?.is_public ?? false

  const openModalFromMenu = (name) => {
    setMenuOpen(false)
    setModal(name)
  }

  const secondaryControls = (
    <>
      <button className="pixel-btn" onClick={toggleUnit} title="Toggle measurement unit" style={secondaryBtn}>
        {unit === 'ft' ? 'Feet' : 'Meters'}
      </button>

      <button className="pixel-btn" onClick={toggleDarkMode} title="Toggle dark mode" style={secondaryBtn}>
        {darkMode ? 'Light mode' : 'Dark mode'}
      </button>

      <button
        className="pixel-btn"
        onClick={() => openModalFromMenu('open-design')}
        title="Open a design from its shared link"
        style={secondaryBtn}
      >
        Open design
      </button>

      {!initializing && (
        <div
          style={{
            display: 'flex',
            alignItems: isMobile ? 'stretch' : 'center',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 8,
          }}
        >
          {user ? (
            <>
              <span
                style={{
                  fontSize: 12,
                  color: color.muted,
                  maxWidth: isMobile ? '100%' : 140,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.email}
              </span>
              {activeDesignIsPublic && (
                <button
                  className="pixel-btn"
                  onClick={() => {
                    setMenuOpen(false)
                    window.open(shareLinkFor(activeDesignId), '_blank', 'noopener')
                  }}
                  title="Open this design's shareable link in a new tab"
                  style={secondaryBtn}
                >
                  🔗 Open share link
                </button>
              )}
              <button
                className="pixel-btn"
                onClick={() => openModalFromMenu('designs')}
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
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                title="Sign out"
                style={secondaryBtn}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              className="pixel-btn"
              onClick={() => openModalFromMenu('auth')}
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
    </>
  )

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          height: 56,
          background: color.bg,
          borderBottom: `1px solid ${color.border}`,
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '0 12px' : '0 20px',
          gap: isMobile ? 10 : 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginRight: isMobile ? 0 : 12,
          }}
        >
          <img src="/favicon.svg" alt="" width={28} height={28} style={{ display: 'block', objectFit: 'contain' }} />
          {!isMobile && (
            <span style={{ fontSize: 16, fontWeight: 700, color: color.text, letterSpacing: -0.2 }}>HomeVision</span>
          )}
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
                  padding: isMobile ? '5px 12px' : '5px 16px',
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
                {isMobile ? (view === '2d' ? '2D' : '3D') : view === '2d' ? '2D Plan' : '3D View'}
              </button>
            )
          })}
        </div>

        {!isMobile && (
          <div style={{ fontSize: 12, color: color.muted, marginLeft: 'auto' }}>
            {activeView === '3d'
              ? 'Drag to rotate · Scroll to zoom · Right-click to pan'
              : 'Click a room to select · Drag to reposition'}
          </div>
        )}

        {isMobile ? (
          <button
            className="pixel-btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="More options"
            aria-expanded={menuOpen}
            style={{ ...secondaryBtn, marginLeft: 'auto', fontSize: 16, padding: '6px 10px' }}
          >
            ⋯
          </button>
        ) : (
          secondaryControls
        )}
      </div>

      {isMobile && menuOpen && (
        <div
          className="pixel-shadow"
          style={{
            position: 'absolute',
            top: '100%',
            right: 12,
            marginTop: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: color.bg,
            border: `1.5px solid ${color.text}`,
            '--pixel-shadow-color': color.text,
            borderRadius: radius.md,
            padding: 12,
            width: 220,
            zIndex: 40,
          }}
        >
          {secondaryControls}
        </div>
      )}

      {modal === 'auth' && <AuthModal onClose={() => setModal(null)} color={color} />}
      {modal === 'designs' && user && <DesignsPanel onClose={() => setModal(null)} color={color} />}
      {modal === 'open-design' && <OpenDesignModal onClose={() => setModal(null)} color={color} />}
    </div>
  )
}
