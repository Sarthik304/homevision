import { beforeEach, describe, expect, it, vi } from 'vitest'
import useHouseStore from './useHouseStore'

// postgrest-js's query builder is chainable AND awaitable at any point in the chain — this fake
// mimics that by returning itself from every builder method and resolving `result` on `then`.
function chainable(result) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    insert: () => chain,
    update: () => chain,
    delete: () => chain,
    single: () => chain,
    then: (resolve) => Promise.resolve(result).then(resolve),
  }
  return chain
}

const mockFrom = vi.fn()
vi.mock('../lib/supabaseClient', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

const { default: useDesignsStore } = await import('./useDesignsStore')

const USER_ID = 'user-1'

beforeEach(() => {
  mockFrom.mockReset()
  useDesignsStore.setState({
    designs: [],
    loadingDesigns: false,
    savingDesign: false,
    designsError: null,
    activeDesignId: null,
    activeDesignName: null,
    sharedDesign: null,
    sharedDesignError: null,
  })
  useHouseStore.setState({ rooms: [{ id: 1, name: 'Living Room' }] })
})

describe('fetchDesigns', () => {
  it('populates designs on success', async () => {
    const rows = [{ id: 'd1', name: 'First', updated_at: '2026-01-01' }]
    mockFrom.mockReturnValue(chainable({ data: rows, error: null }))

    await useDesignsStore.getState().fetchDesigns(USER_ID)

    expect(useDesignsStore.getState().designs).toEqual(rows)
    expect(useDesignsStore.getState().loadingDesigns).toBe(false)
  })

  it('clears designs and records the error on failure', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'network down' } }))

    await useDesignsStore.getState().fetchDesigns(USER_ID)

    expect(useDesignsStore.getState().designs).toEqual([])
    expect(useDesignsStore.getState().designsError).toBe('network down')
  })
})

describe('saveDesign', () => {
  it('inserts a new design when none is active, then adopts its id', async () => {
    mockFrom
      .mockReturnValueOnce(chainable({ data: { id: 'new-id', name: 'Mine' }, error: null })) // insert
      .mockReturnValueOnce(chainable({ data: [], error: null })) // the fetchDesigns refresh after

    const ok = await useDesignsStore.getState().saveDesign(USER_ID, 'Mine')

    expect(ok).toBe(true)
    expect(useDesignsStore.getState().activeDesignId).toBe('new-id')
    expect(useDesignsStore.getState().activeDesignName).toBe('Mine')
  })

  it('updates the active design instead of inserting a new one', async () => {
    useDesignsStore.setState({ activeDesignId: 'existing-id' })
    mockFrom
      .mockReturnValueOnce(chainable({ data: { id: 'existing-id', name: 'Renamed' }, error: null })) // update
      .mockReturnValueOnce(chainable({ data: [], error: null })) // refresh

    await useDesignsStore.getState().saveDesign(USER_ID, 'Renamed')

    expect(useDesignsStore.getState().activeDesignId).toBe('existing-id')
    expect(useDesignsStore.getState().activeDesignName).toBe('Renamed')
  })
})

describe('loadDesign', () => {
  it('replaces the house rooms and marks the design active', async () => {
    const rooms = [{ id: 42, name: 'Loaded' }]
    mockFrom.mockReturnValue(chainable({ data: { id: 'd1', name: 'Saved', rooms }, error: null }))

    const ok = await useDesignsStore.getState().loadDesign('d1')

    expect(ok).toBe(true)
    expect(useHouseStore.getState().rooms).toBe(rooms)
    expect(useDesignsStore.getState().activeDesignId).toBe('d1')
  })

  it('reports failure and leaves the house untouched on error', async () => {
    const before = useHouseStore.getState().rooms
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'not found' } }))

    const ok = await useDesignsStore.getState().loadDesign('missing')

    expect(ok).toBe(false)
    expect(useDesignsStore.getState().designsError).toBe('not found')
    expect(useHouseStore.getState().rooms).toBe(before)
  })
})

describe('setDesignPublic', () => {
  it('flips the flag and refreshes the list on success', async () => {
    mockFrom
      .mockReturnValueOnce(chainable({ error: null })) // update
      .mockReturnValueOnce(chainable({ data: [{ id: 'd1', name: 'A', updated_at: '', is_public: true }], error: null })) // refresh

    const ok = await useDesignsStore.getState().setDesignPublic(USER_ID, 'd1', true)

    expect(ok).toBe(true)
    // the refresh (fetchDesigns) is fired-and-forgotten, not awaited — same as saveDesign/deleteDesign
    await vi.waitFor(() => {
      expect(useDesignsStore.getState().designs[0]?.is_public).toBe(true)
    })
  })

  it('records the error on failure without touching the list', async () => {
    useDesignsStore.setState({ designs: [{ id: 'd1', name: 'A', updated_at: '', is_public: false }] })
    mockFrom.mockReturnValue(chainable({ error: { message: 'nope' } }))

    const ok = await useDesignsStore.getState().setDesignPublic(USER_ID, 'd1', true)

    expect(ok).toBe(false)
    expect(useDesignsStore.getState().designsError).toBe('nope')
    expect(useDesignsStore.getState().designs[0].is_public).toBe(false)
  })
})

describe('loadPublicDesign', () => {
  it('loads the shared rooms, marks sharedDesign, and does not claim ownership', async () => {
    const rooms = [{ id: 7, name: "Someone else's room" }]
    mockFrom.mockReturnValue(chainable({ data: { id: 'shared-1', name: "Jane's Apartment", rooms }, error: null }))

    const ok = await useDesignsStore.getState().loadPublicDesign('shared-1')

    expect(ok).toBe(true)
    expect(useHouseStore.getState().rooms).toBe(rooms)
    expect(useDesignsStore.getState().sharedDesign).toEqual({ id: 'shared-1', name: "Jane's Apartment" })
    // must stay null — otherwise a later saveDesign would try to overwrite someone else's row
    expect(useDesignsStore.getState().activeDesignId).toBeNull()
  })

  it('surfaces a friendly error and leaves the house untouched when the design is missing/private', async () => {
    const before = useHouseStore.getState().rooms
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'no rows' } }))

    const ok = await useDesignsStore.getState().loadPublicDesign('missing')

    expect(ok).toBe(false)
    expect(useDesignsStore.getState().sharedDesignError).toMatch(/isn't available/)
    expect(useDesignsStore.getState().designsError).toBeNull() // distinct field — see SharedDesignBanner
    expect(useHouseStore.getState().rooms).toBe(before)
  })
})

describe('saveDesign clearing sharedDesign', () => {
  it('clears sharedDesign once a viewed shared design is saved as the user\'s own copy', async () => {
    useDesignsStore.setState({ sharedDesign: { id: 'shared-1', name: 'Original' } })
    mockFrom
      .mockReturnValueOnce(chainable({ data: { id: 'new-id', name: 'Original' }, error: null })) // insert
      .mockReturnValueOnce(chainable({ data: [], error: null })) // refresh

    await useDesignsStore.getState().saveDesign(USER_ID, 'Original')

    expect(useDesignsStore.getState().sharedDesign).toBeNull()
    expect(useDesignsStore.getState().activeDesignId).toBe('new-id')
  })
})

describe('deleteDesign', () => {
  it('clears activeDesignId when the deleted design was the active one', async () => {
    useDesignsStore.setState({ activeDesignId: 'd1', activeDesignName: 'Active' })
    mockFrom
      .mockReturnValueOnce(chainable({ error: null })) // delete
      .mockReturnValueOnce(chainable({ data: [], error: null })) // refresh

    await useDesignsStore.getState().deleteDesign(USER_ID, 'd1')

    expect(useDesignsStore.getState().activeDesignId).toBeNull()
  })

  it('leaves activeDesignId alone when a different design is deleted', async () => {
    useDesignsStore.setState({ activeDesignId: 'd1', activeDesignName: 'Active' })
    mockFrom
      .mockReturnValueOnce(chainable({ error: null }))
      .mockReturnValueOnce(chainable({ data: [], error: null }))

    await useDesignsStore.getState().deleteDesign(USER_ID, 'd2')

    expect(useDesignsStore.getState().activeDesignId).toBe('d1')
  })
})

describe('deleteAllDesigns', () => {
  it('clears the local list and active design on success', async () => {
    useDesignsStore.setState({
      designs: [
        { id: 'd1', name: 'A', updated_at: '' },
        { id: 'd2', name: 'B', updated_at: '' },
      ],
      activeDesignId: 'd1',
      activeDesignName: 'A',
    })
    mockFrom.mockReturnValue(chainable({ error: null }))

    const ok = await useDesignsStore.getState().deleteAllDesigns(USER_ID)

    expect(ok).toBe(true)
    expect(useDesignsStore.getState().designs).toEqual([])
    expect(useDesignsStore.getState().activeDesignId).toBeNull()
    expect(useDesignsStore.getState().activeDesignName).toBeNull()
    expect(useDesignsStore.getState().deletingAllDesigns).toBe(false)
  })

  it('scopes the bulk delete to this user, not the whole table', async () => {
    mockFrom.mockReturnValue(chainable({ error: null }))

    await useDesignsStore.getState().deleteAllDesigns(USER_ID)

    expect(mockFrom).toHaveBeenCalledWith('designs')
  })

  it('leaves the list untouched and records the error on failure', async () => {
    useDesignsStore.setState({ designs: [{ id: 'd1', name: 'A', updated_at: '' }] })
    mockFrom.mockReturnValue(chainable({ error: { message: 'delete failed' } }))

    const ok = await useDesignsStore.getState().deleteAllDesigns(USER_ID)

    expect(ok).toBe(false)
    expect(useDesignsStore.getState().designs).toHaveLength(1)
    expect(useDesignsStore.getState().designsError).toBe('delete failed')
  })
})

describe('reset', () => {
  it('clears designs, the active design, and any shared-design view, e.g. on sign-out', () => {
    useDesignsStore.setState({
      designs: [{ id: 'd1', name: 'x', updated_at: '' }],
      activeDesignId: 'd1',
      activeDesignName: 'x',
      designsError: 'stale error',
      sharedDesign: { id: 'shared-1', name: 'Someone else\'s' },
      sharedDesignError: 'stale shared-link error',
    })

    useDesignsStore.getState().reset()

    expect(useDesignsStore.getState()).toMatchObject({
      designs: [],
      activeDesignId: null,
      activeDesignName: null,
      designsError: null,
      sharedDesign: null,
      sharedDesignError: null,
    })
  })
})

describe('startNewDesign', () => {
  it('clears the active design and any shared-design view', () => {
    useDesignsStore.setState({
      activeDesignId: 'd1',
      activeDesignName: 'x',
      sharedDesign: { id: 'shared-1', name: 'Someone else\'s' },
      sharedDesignError: 'stale shared-link error',
    })

    useDesignsStore.getState().startNewDesign()

    expect(useDesignsStore.getState()).toMatchObject({
      activeDesignId: null,
      activeDesignName: null,
      sharedDesign: null,
      sharedDesignError: null,
    })
  })
})
