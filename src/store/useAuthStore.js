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
  // future sign-in/sign-out events (including ones from other tabs). Returns an unsubscribe
  // function: App.jsx's effect returns it as its own cleanup so StrictMode's mount -> cleanup ->
  // mount double-invoke in dev leaves exactly one listener registered, not two.
  init: () => {
    if (!supabase) {
      set({ initializing: false })
      return () => {}
    }
    supabase.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, initializing: false })
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      set({ user })
      if (!user) useDesignsStore.getState().reset()
    })
    return () => subscription.unsubscribe()
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

  // permanently deletes the signed-in user's account (and, via a cascading foreign key, all
  // their saved designs) — see the delete_own_account() function in supabase/schema.sql, which
  // is what actually makes this possible: the client's own privileges can't touch auth.users.
  deleteAccount: async () => {
    if (!supabase) return { ok: false }
    set({ authLoading: true, authError: null })
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      set({ authLoading: false, authError: error.message })
      return { ok: false }
    }
    // the account is gone, but the client still holds a session token for it — sign out to
    // clear it locally; this also fires onAuthStateChange, which resets user + useDesignsStore
    await supabase.auth.signOut()
    set({ authLoading: false })
    return { ok: true }
  },

  clearAuthError: () => set({ authError: null }),
}))

export default useAuthStore
