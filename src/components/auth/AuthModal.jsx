import { useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import useAuthStore from '../../store/useAuthStore'
import { supabase } from '../../lib/supabaseClient'
import Modal from '../ui/Modal'
import { radius } from '../../theme'

export default function AuthModal({ onClose, color }) {
  const { signIn, signUp, authLoading, authError, clearAuthError } = useAuthStore(
    useShallow((s) => ({
      signIn: s.signIn,
      signUp: s.signUp,
      authLoading: s.authLoading,
      authError: s.authError,
      clearAuthError: s.clearAuthError,
    }))
  )
  const [mode, setMode] = useState('sign-in') // 'sign-in' | 'sign-up'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState(null)

  if (!supabase) {
    return (
      <Modal title="Accounts aren't set up yet" onClose={onClose} color={color}>
        <p style={{ fontSize: 13, color: color.muted, lineHeight: 1.6, margin: 0 }}>
          Create a free project at{' '}
          <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: color.brand }}>
            supabase.com
          </a>
          , run <code>supabase/schema.sql</code> in its SQL editor, then set{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in{' '}
          <code>.env.local</code> and restart the dev server. See the README for details.
        </p>
      </Modal>
    )
  }

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: color.bg,
    border: `1px solid ${color.borderInput}`,
    borderRadius: radius.sm,
    color: color.text,
    fontSize: 13,
    boxSizing: 'border-box',
  }

  const switchMode = (next) => {
    setMode(next)
    setNotice(null)
    clearAuthError()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setNotice(null)
    if (mode === 'sign-in') {
      const { ok } = await signIn(email, password)
      if (ok) onClose()
    } else {
      const { ok, needsConfirmation } = await signUp(email, password)
      if (ok && needsConfirmation) {
        setNotice('Check your email to confirm your account, then sign in.')
      } else if (ok) {
        onClose()
      }
    }
  }

  return (
    <Modal title={mode === 'sign-in' ? 'Sign in' : 'Create account'} onClose={onClose} color={color}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[
          { key: 'sign-in', label: 'Sign in' },
          { key: 'sign-up', label: 'Create account' },
        ].map(({ key, label }) => {
          const active = mode === key
          return (
            <button
              key={key}
              className="pixel-btn"
              onClick={() => switchMode(key)}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: radius.sm,
                border: `1px solid ${active ? color.brand : color.border}`,
                background: active ? color.brandTint : color.bg,
                color: active ? color.brand : color.muted,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: active ? 700 : 500,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label style={{ fontSize: 12, color: color.muted, display: 'block', marginBottom: 6 }}>Email</label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: color.muted, display: 'block', marginBottom: 6 }}>Password</label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        {authError && <div style={{ fontSize: 12, color: color.danger }}>{authError}</div>}
        {notice && <div style={{ fontSize: 12, color: color.brand }}>{notice}</div>}

        <button
          className="pixel-btn"
          type="submit"
          disabled={authLoading}
          style={{
            marginTop: 4,
            padding: '9px',
            background: color.brand,
            border: `1px solid ${color.brand}`,
            borderRadius: radius.pill,
            color: '#fff',
            cursor: authLoading ? 'default' : 'pointer',
            opacity: authLoading ? 0.7 : 1,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {authLoading ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>
      </form>
    </Modal>
  )
}
