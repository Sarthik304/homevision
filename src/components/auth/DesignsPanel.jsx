import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import useAuthStore from '../../store/useAuthStore'
import useDesignsStore from '../../store/useDesignsStore'
import Modal from '../ui/Modal'
import DeleteAccountSection from './DeleteAccountSection'
import { radius } from '../../theme'
import { shareLinkFor } from '../../utils/shareLink'

const selectDesignsState = (s) => ({
  designs: s.designs,
  loadingDesigns: s.loadingDesigns,
  savingDesign: s.savingDesign,
  deletingAllDesigns: s.deletingAllDesigns,
  designsError: s.designsError,
  activeDesignId: s.activeDesignId,
  activeDesignName: s.activeDesignName,
  sharedDesign: s.sharedDesign,
  fetchDesigns: s.fetchDesigns,
  saveDesign: s.saveDesign,
  loadDesign: s.loadDesign,
  deleteDesign: s.deleteDesign,
  deleteAllDesigns: s.deleteAllDesigns,
  setDesignPublic: s.setDesignPublic,
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
    sharedDesign,
    fetchDesigns,
    saveDesign,
    loadDesign,
    deleteDesign,
    deleteAllDesigns,
    setDesignPublic,
    startNewDesign,
  } = useDesignsStore(useShallow(selectDesignsState))
  const [nameDraft, setNameDraft] = useState(activeDesignName ?? sharedDesign?.name ?? 'Untitled design')
  const [copiedId, setCopiedId] = useState(null)

  const copyShareLink = async (designId) => {
    const link = shareLinkFor(designId)
    try {
      await navigator.clipboard.writeText(link)
      setCopiedId(designId)
      setTimeout(() => setCopiedId((id) => (id === designId ? null : id)), 2000)
    } catch {
      // clipboard permission denied/unavailable — fall back to a manual-copy prompt
      // instead of silently claiming success
      window.prompt('Copy this link:', link)
    }
  }

  useEffect(() => {
    fetchDesigns(user.id)
  }, [user.id, fetchDesigns])

  useEffect(() => {
    setNameDraft(activeDesignName ?? sharedDesign?.name ?? 'Untitled design')
  }, [activeDesignName, sharedDesign])

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
                flexDirection: 'column',
                gap: 6,
                padding: '8px 10px',
                borderRadius: radius.sm,
                border: `1px solid ${color.border}`,
                background: d.id === activeDesignId ? color.brandTint : 'transparent',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: d.is_public ? color.brand : color.muted, flex: 1, minWidth: '50%' }}>
                  {d.is_public ? '🔗 Shared — anyone with the link can view it' : 'Not shared'}
                </span>
                {d.is_public && (
                  <>
                    <button
                      className="pixel-btn"
                      onClick={() => window.open(shareLinkFor(d.id), '_blank', 'noopener')}
                      style={{ ...smallButton, color: color.brand, borderColor: color.brand, flexShrink: 0 }}
                    >
                      Open
                    </button>
                    <button
                      className="pixel-btn"
                      onClick={() => copyShareLink(d.id)}
                      style={{ ...smallButton, color: color.brand, borderColor: color.brand, flexShrink: 0 }}
                    >
                      {copiedId === d.id ? 'Copied!' : 'Copy link'}
                    </button>
                  </>
                )}
                <button
                  className="pixel-btn"
                  onClick={() => setDesignPublic(user.id, d.id, !d.is_public)}
                  style={{ ...smallButton, flexShrink: 0 }}
                >
                  {d.is_public ? 'Unshare' : 'Share'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteAccountSection savedDesignCount={designs.length} onDeleted={onClose} color={color} />
    </Modal>
  )
}
