import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import useDesignsStore from './useDesignsStore'

// Auth state, backed by Supabase Auth. Kept separate from useHouseStore (which is purely house
// geometry) since who's signed in is orthogonal to what's being designed.
const useAuthStore = create((set) => ({
  user: null,
  // true until the initial session check resolves, so the navbar can avoid flashing a
  // "Sign in" button for a moment before a real session loads
  initializing: true,
  authLoading: false,
  authError: null,

  // called once at app startup (see App.jsx) — reads any existing session and subscribes to
  // future sign-in/sign-out events (including ones from other tabs)
  init: () => {
    if (!supabase) {
      set({ initializing: false })
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, initializing: false })
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      set({ user })
      if (!user) useDesignsStore.getState().reset()
    })
  },

  signUp: async (email, password) => {
    if (!supabase) return { ok: false }
    set({ authLoading: true, authError: null })
    const { data, error } = await supabase.auth.signUp({ email, password })
    set({ authLoading: false, authError: error?.message ?? null })
    // if email confirmation is on, signUp succeeds but returns no session yet
    return { ok: !error, needsConfirmation: !error && !data.session }
  },

  signIn: async (email, password) => {
    if (!supabase) return { ok: false }
    set({ authLoading: true, authError: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ authLoading: false, authError: error?.message ?? null })
    return { ok: !error }
  },

  signOut: async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  },

  clearAuthError: () => set({ authError: null }),
}))

export default useAuthStore
