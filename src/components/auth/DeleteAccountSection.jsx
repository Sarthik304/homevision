import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import useAuthStore from '../../store/useAuthStore'
import { radius } from '../../theme'

const CONFIRM_WORD = 'DELETE'

// "Danger zone" for deleting the whole account — requires typing a confirmation word
export default function DeleteAccountSection({ savedDesignCount, onDeleted, color }) {
  const { deleteAccount, authLoading, authError, clearAuthError } = useAuthStore(
    useShallow((s) => ({
      deleteAccount: s.deleteAccount,
      authLoading: s.authLoading,
      authError: s.authError,
      clearAuthError: s.clearAuthError,
    }))
  )
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const cancel = () => {
    setConfirming(false)
    setConfirmText('')
    clearAuthError()
  }

  const handleDelete = async () => {
    const { ok } = await deleteAccount()
    if (ok) onDeleted()
  }

  return (
    <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${color.border}` }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: color.danger,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 8,
        }}
      >
        Danger zone
      </div>

      {!confirming ? (
        <button
          className="pixel-btn"
          onClick={() => setConfirming(true)}
          style={{
            width: '100%',
            padding: '7px 0',
            borderRadius: radius.sm,
            border: `1px solid ${color.danger}`,
            background: 'transparent',
            color: color.danger,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Delete my account
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, color: color.muted, lineHeight: 1.5 }}>
            This permanently deletes your account and all {savedDesignCount} saved{' '}
            {savedDesignCount === 1 ? 'design' : 'designs'}. This can't be undone. Type{' '}
            <strong style={{ color: color.text }}>{CONFIRM_WORD}</strong> to confirm.
          </div>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            style={{
              padding: '8px 10px',
              border: `1px solid ${color.borderInput}`,
              borderRadius: radius.sm,
              background: color.bg,
              color: color.text,
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
          {authError && <div style={{ fontSize: 12, color: color.danger }}>{authError}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="pixel-btn"
              onClick={handleDelete}
              disabled={confirmText !== CONFIRM_WORD || authLoading}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: radius.sm,
                border: `1px solid ${color.danger}`,
                background: confirmText === CONFIRM_WORD ? color.danger : color.surface,
                color: confirmText === CONFIRM_WORD ? '#fff' : color.muted,
                cursor: confirmText === CONFIRM_WORD && !authLoading ? 'pointer' : 'default',
                opacity: authLoading ? 0.7 : 1,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {authLoading ? 'Deleting…' : 'Permanently delete account'}
            </button>
            <button
              className="pixel-btn"
              onClick={cancel}
              style={{
                padding: '8px 14px',
                borderRadius: radius.sm,
                border: `1px solid ${color.border}`,
                background: color.bg,
                color: color.text,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
