import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import useAuthStore from '../../store/useAuthStore'
import useDesignsStore from '../../store/useDesignsStore'
import Modal from '../ui/Modal'
import { radius } from '../../theme'

const selectDesignsState = (s) => ({
  designs: s.designs,
  loadingDesigns: s.loadingDesigns,
  savingDesign: s.savingDesign,
  deletingAllDesigns: s.deletingAllDesigns,
  designsError: s.designsError,
  activeDesignId: s.activeDesignId,
  activeDesignName: s.activeDesignName,
  fetchDesigns: s.fetchDesigns,
  saveDesign: s.saveDesign,
  loadDesign: s.loadDesign,
  deleteDesign: s.deleteDesign,
  deleteAllDesigns: s.deleteAllDesigns,
  startNewDesign: s.startNewDesign,
})

export default function DesignsPanel({ onClose, color }) {
  const user = useAuthStore((s) => s.user)
  const {
    designs,
    loadingDesigns,
    savingDesign,
    deletingAllDesigns,
    designsError,
    activeDesignId,
    activeDesignName,
    fetchDesigns,
    saveDesign,
    loadDesign,
    deleteDesign,
    deleteAllDesigns,
    startNewDesign,
  } = useDesignsStore(useShallow(selectDesignsState))
  const [nameDraft, setNameDraft] = useState(activeDesignName ?? 'Untitled design')

  useEffect(() => {
    fetchDesigns(user.id)
  }, [user.id, fetchDesigns])

  useEffect(() => {
    setNameDraft(activeDesignName ?? 'Untitled design')
  }, [activeDesignName])

  const smallButton = {
    padding: '5px 10px',
    borderRadius: radius.sm,
    border: `1px solid ${color.border}`,
    background: color.bg,
    color: color.text,
    cursor: 'pointer',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }

  return (
    <Modal title="My designs" onClose={onClose} color={color} width={380}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          placeholder="Design name"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '8px 10px',
            border: `1px solid ${color.borderInput}`,
            borderRadius: radius.sm,
            background: color.bg,
            color: color.text,
            fontSize: 13,
            boxSizing: 'border-box',
          }}
        />
        <button
          className="pixel-btn"
          onClick={() => saveDesign(user.id, nameDraft.trim() || 'Untitled design')}
          disabled={savingDesign}
          style={{
            padding: '0 14px',
            background: color.brand,
            border: `1px solid ${color.brand}`,
            borderRadius: radius.sm,
            color: '#fff',
            cursor: savingDesign ? 'default' : 'pointer',
            opacity: savingDesign ? 0.7 : 1,
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {savingDesign ? 'Saving…' : activeDesignId ? 'Update' : 'Save'}
        </button>
      </div>

      {activeDesignId && (
        <button
          className="pixel-btn"
          onClick={startNewDesign}
          style={{ ...smallButton, width: '100%', marginBottom: 14 }}
        >
          + Start a new design
        </button>
      )}

      {designsError && (
        <div style={{ fontSize: 12, color: color.danger, marginBottom: 10 }}>{designsError}</div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: color.muted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Saved designs
        </span>
        {designs.length > 0 && (
          <button
            className="pixel-btn"
            onClick={() => {
              const count = designs.length
              const noun = count === 1 ? 'design' : 'designs'
              if (window.confirm(`Delete all ${count} saved ${noun}? This frees up your storage but can't be undone.`)) {
                deleteAllDesigns(user.id)
              }
            }}
            disabled={deletingAllDesigns}
            style={{
              background: 'transparent',
              border: 'none',
              color: color.danger,
              cursor: deletingAllDesigns ? 'default' : 'pointer',
              opacity: deletingAllDesigns ? 0.6 : 1,
              fontSize: 11,
              fontWeight: 600,
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {deletingAllDesigns ? 'Deleting…' : 'Delete all'}
          </button>
        )}
      </div>

      {loadingDesigns ? (
        <div style={{ fontSize: 12, color: color.muted }}>Loading…</div>
      ) : designs.length === 0 ? (
        <div style={{ fontSize: 12, color: color.muted }}>No saved designs yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {designs.map((d) => (
            <div
              key={d.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: radius.sm,
                border: `1px solid ${color.border}`,
                background: d.id === activeDesignId ? color.brandTint : 'transparent',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: color.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </div>
                <div style={{ fontSize: 10, color: color.muted }}>
                  {new Date(d.updated_at).toLocaleString()}
                </div>
              </div>
              <button
                className="pixel-btn"
                onClick={() => loadDesign(d.id).then((ok) => ok && onClose())}
                style={smallButton}
              >
                Load
              </button>
              <button
                className="pixel-btn"
                onClick={() => {
                  if (window.confirm(`Delete "${d.name}"? This can't be undone.`)) {
                    deleteDesign(user.id, d.id)
                  }
                }}
                style={{ ...smallButton, color: color.danger, borderColor: color.danger }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
