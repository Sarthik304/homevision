import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import useDesignsStore from './useDesignsStore'

// Auth state, backed by Supabase Auth. Kept separate from useHouseStore (house geometry).
const useAuthStore = create((set) => ({
  user: null,
  initializing: true, // true until initial session check resolves (avoids a "Sign in" flash)
  authLoading: false,
  authError: null,

  // reads existing session, subscribes to future sign-in/sign-out; returns an unsubscribe fn
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

  // permanently deletes the signed-in user's account and all their saved designs
  deleteAccount: async () => {
    if (!supabase) return { ok: false }
    set({ authLoading: true, authError: null })
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      set({ authLoading: false, authError: error.message })
      return { ok: false }
    }
    await supabase.auth.signOut() // clears the local session token
    set({ authLoading: false })
    return { ok: true }
  },

  clearAuthError: () => set({ authError: null }),
}))

export default useAuthStore
