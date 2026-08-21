import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import useHouseStore from '../../store/useHouseStore'
import useAuthStore from '../../store/useAuthStore'
import useDesignsStore from '../../store/useDesignsStore'
import AuthModal from '../auth/AuthModal'
import { getColors, radius } from '../../theme'

// Shown when the current view was loaded from someone else's shareable link (see
// App.jsx's ?design= handling and useDesignsStore.loadPublicDesign). Lets the visitor
// save their own independent copy — the original design is never touched by them.
export default function SharedDesignBanner() {
  const darkMode = useHouseStore((s) => s.darkMode)
  const color = getColors(darkMode)
  const user = useAuthStore((s) => s.user)
  const { sharedDesign, sharedDesignError, savingDesign, clearSharedDesign, saveDesign } = useDesignsStore(
    useShallow((s) => ({
      sharedDesign: s.sharedDesign,
      sharedDesignError: s.sharedDesignError,
      savingDesign: s.savingDesign,
      clearSharedDesign: s.clearSharedDesign,
      saveDesign: s.saveDesign,
    }))
  )
  const [showAuth, setShowAuth] = useState(false)
  // saveDesign clears sharedDesign in the store on success (it's no longer "someone else's"
  // once saved), so the post-save confirmation is tracked here instead of reading it back
  const [savedName, setSavedName] = useState(null)

  if (!sharedDesign && !savedName && !sharedDesignError) return null

  const handleSaveCopy = async () => {
    if (!user) {
      setShowAuth(true)
      return
    }
    const name = sharedDesign.name
    const ok = await saveDesign(user.id, name)
    if (ok) setSavedName(name)
  }

  const handleDismiss = () => {
    clearSharedDesign()
    setSavedName(null)
  }

  return (
    <>
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 20px',
          background: sharedDesignError ? 'transparent' : color.brandTint,
          borderBottom: `1px solid ${color.border}`,
          fontSize: 12,
          color: sharedDesignError ? color.danger : color.text,
        }}
      >
        <span style={{ flex: 1 }}>
          {sharedDesignError ||
            (savedName
              ? `Saved "${savedName}" to your designs — it's yours to edit freely now.`
              : `Viewing "${sharedDesign.name}" — shared with you. Changes here won't affect the original.`)}
        </span>
        {!savedName && !sharedDesignError && (
          <button
            className="pixel-btn"
            onClick={handleSaveCopy}
            disabled={savingDesign}
            style={{
              padding: '5px 12px',
              background: color.brand,
              border: `1px solid ${color.brand}`,
              borderRadius: radius.sm,
              color: '#fff',
              cursor: savingDesign ? 'default' : 'pointer',
              opacity: savingDesign ? 0.7 : 1,
              fontSize: 11,
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {savingDesign ? 'Saving…' : user ? 'Save a copy' : 'Sign in to save a copy'}
          </button>
        )}
        <button
          className="pixel-btn"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            background: 'transparent',
            border: 'none',
            color: color.muted,
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
            padding: '2px 4px',
          }}
        >
          ×
        </button>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} color={color} />}
    </>
  )
}
