import { useState } from 'react'
import useDesignsStore from '../../store/useDesignsStore'
import Modal from './Modal'
import { radius } from '../../theme'

// accepts either a full share link (?design=<uuid>) or a bare design id
function extractDesignId(input) {
  const trimmed = input.trim()
  if (!trimmed) return null
  try {
    return new URL(trimmed).searchParams.get('design') ?? null
  } catch {
    return trimmed
  }
}

export default function OpenDesignModal({ onClose, color }) {
  const loadPublicDesign = useDesignsStore((s) => s.loadPublicDesign)
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const designId = extractDesignId(link)
    if (!designId) {
      setError('Paste a design link to open it.')
      return
    }
    setLoading(true)
    setError(null)
    const ok = await loadPublicDesign(designId)
    setLoading(false)
    if (ok) onClose()
    else setError("This design isn't available — it may have been unshared or deleted.")
  }

  return (
    <Modal title="Open design" onClose={onClose} color={color}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: color.muted, display: 'block', marginBottom: 6 }}>
            Design link
          </label>
          <input
            autoFocus
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Paste a shared design link"
            style={{
              width: '100%',
              padding: '8px 10px',
              background: color.bg,
              border: `1px solid ${color.borderInput}`,
              borderRadius: radius.sm,
              color: color.text,
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && <div style={{ fontSize: 12, color: color.danger }}>{error}</div>}

        <button
          className="pixel-btn"
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4,
            padding: '9px',
            background: color.brand,
            border: `1px solid ${color.brand}`,
            borderRadius: radius.pill,
            color: '#fff',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {loading ? 'Opening…' : 'Open'}
        </button>
      </form>
    </Modal>
  )
}
