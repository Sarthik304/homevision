import { useEffect } from 'react'
import { radius } from '../../theme'

export default function Modal({ title, onClose, children, color, width = 360 }) {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return
      // capture phase + stopPropagation: other window-level Escape handlers (e.g.
      // FloorPlanEditor's deselect-all) live on the bubble phase, so without this a modal's
      // Escape-to-close would also fire them as an unrelated side effect
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="pixel-shadow"
        style={{
          width,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          background: color.bg,
          border: `1.5px solid ${color.text}`,
          borderRadius: radius.md,
          padding: 20,
          boxSizing: 'border-box',
          '--pixel-shadow-color': color.text,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: color.text }}>{title}</span>
          <button
            className="pixel-btn"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              color: color.muted,
              cursor: 'pointer',
              fontSize: 18,
              lineHeight: 1,
              padding: '2px 4px',
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
