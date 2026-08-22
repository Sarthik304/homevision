import { create } from 'zustand'
import { supabase } from '../lib/supabaseClient'
import useHouseStore from './useHouseStore'

// Saved-designs CRUD against Supabase, plus which design is currently loaded/being edited.
const useDesignsStore = create((set, get) => ({
  designs: [], // [{ id, name, updated_at, is_public }] for the signed-in user, newest first
  loadingDesigns: false,
  savingDesign: false,
  deletingAllDesigns: false,
  designsError: null,
  activeDesignId: null,
  activeDesignName: null,
  sharedDesign: null, // { id, name } | null — someone else's design opened via share link
  sharedDesignError: null, // separate from designsError so share-link errors show independently

  fetchDesigns: async (userId) => {
    if (!supabase || !userId) return
    set({ loadingDesigns: true, designsError: null })
    const { data, error } = await supabase
      .from('designs')
      .select('id, name, updated_at, is_public')
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
      set({ activeDesignId: data.id, activeDesignName: data.name, sharedDesign: null })
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
    set({ activeDesignId: data.id, activeDesignName: data.name, sharedDesign: null })
    return true
  },

  // flips a design's shareable-link visibility (RLS enforces owner-only on the backend)
  setDesignPublic: async (userId, designId, isPublic) => {
    if (!supabase || !userId) return false
    set({ designsError: null })
    const { error } = await supabase.from('designs').update({ is_public: isPublic }).eq('id', designId)
    if (!error) get().fetchDesigns(userId)
    else set({ designsError: error.message })
    return !error
  },

  // loads a design shared via its link; works signed-out; leaves activeDesignId untouched so a
  // later save creates the viewer's own copy instead of overwriting the original
  loadPublicDesign: async (designId) => {
    if (!supabase) return false
    set({ sharedDesignError: null })
    const { data, error } = await supabase
      .from('designs')
      .select('id, name, rooms')
      .eq('id', designId)
      .single()
    if (error) {
      set({ sharedDesignError: "This design isn't available — it may have been unshared or deleted." })
      return false
    }
    useHouseStore.getState().loadRooms(data.rooms)
    set({ activeDesignId: null, activeDesignName: null, sharedDesign: { id: data.id, name: data.name } })
    return true
  },

  clearSharedDesign: () => set({ sharedDesign: null, sharedDesignError: null }),

  deleteDesign: async (userId, designId) => {
    if (!supabase) return
    const { error } = await supabase.from('designs').delete().eq('id', designId)
    if (!error) {
      if (get().activeDesignId === designId) set({ activeDesignId: null, activeDesignName: null })
      get().fetchDesigns(userId)
    }
    set({ designsError: error?.message ?? null })
  },

  // wipes every saved design for this user (RLS scopes the delete to their own rows)
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

  startNewDesign: () =>
    set({ activeDesignId: null, activeDesignName: null, sharedDesign: null, sharedDesignError: null }),

  // cleared on sign-out
  reset: () =>
    set({
      designs: [],
      activeDesignId: null,
      activeDesignName: null,
      designsError: null,
      sharedDesign: null,
      sharedDesignError: null,
    }),
}))

export default useDesignsStore
