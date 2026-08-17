import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import useHouseStore from './useHouseStore'

// Saved-designs CRUD against Supabase, plus which design (if any) is currently loaded/being
// edited. Reads/writes useHouseStore's `rooms` directly rather than duplicating it here.
const useDesignsStore = create((set, get) => ({
  designs: [], // [{ id, name, updated_at }] for the signed-in user, newest first
  loadingDesigns: false,
  savingDesign: false,
  deletingAllDesigns: false,
  designsError: null,
  activeDesignId: null,
  activeDesignName: null,

  fetchDesigns: async (userId) => {
    if (!supabase || !userId) return
    set({ loadingDesigns: true, designsError: null })
    const { data, error } = await supabase
      .from('designs')
      .select('id, name, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    set({
      designs: error ? [] : data,
      loadingDesigns: false,
      designsError: error?.message ?? null,
    })
  },

  // updates the active design if one is loaded, otherwise inserts a new one
  saveDesign: async (userId, name) => {
    if (!supabase || !userId) return false
    set({ savingDesign: true, designsError: null })
    const rooms = useHouseStore.getState().rooms
    const { activeDesignId } = get()

    const { data, error } = activeDesignId
      ? await supabase
          .from('designs')
          .update({ name, rooms })
          .eq('id', activeDesignId)
          .select('id, name')
          .single()
      : await supabase
          .from('designs')
          .insert({ user_id: userId, name, rooms })
          .select('id, name')
          .single()

    if (!error) {
      set({ activeDesignId: data.id, activeDesignName: data.name })
      get().fetchDesigns(userId)
    }
    set({ savingDesign: false, designsError: error?.message ?? null })
    return !error
  },

  loadDesign: async (designId) => {
    if (!supabase) return false
    set({ designsError: null })
    const { data, error } = await supabase
      .from('designs')
      .select('id, name, rooms')
      .eq('id', designId)
      .single()
    if (error) {
      set({ designsError: error.message })
      return false
    }
    useHouseStore.getState().loadRooms(data.rooms)
    set({ activeDesignId: data.id, activeDesignName: data.name })
    return true
  },

  deleteDesign: async (userId, designId) => {
    if (!supabase) return
    const { error } = await supabase.from('designs').delete().eq('id', designId)
    if (!error) {
      if (get().activeDesignId === designId) set({ activeDesignId: null, activeDesignName: null })
      get().fetchDesigns(userId)
    }
    set({ designsError: error?.message ?? null })
  },

  // wipes every saved design for this user — RLS scopes the delete to their own rows, so this
  // can never touch another user's data even though it has no per-row id filter
  deleteAllDesigns: async (userId) => {
    if (!supabase || !userId) return false
    set({ deletingAllDesigns: true, designsError: null })
    const { error } = await supabase.from('designs').delete().eq('user_id', userId)
    set({
      deletingAllDesigns: false,
      designsError: error?.message ?? null,
      ...(error ? {} : { designs: [], activeDesignId: null, activeDesignName: null }),
    })
    return !error
  },

  startNewDesign: () => set({ activeDesignId: null, activeDesignName: null }),

  // cleared on sign-out so the next signed-in user doesn't briefly see the previous one's list
  reset: () => set({ designs: [], activeDesignId: null, activeDesignName: null, designsError: null }),
}))

export default useDesignsStore
