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

describe('reset', () => {
  it('clears designs and the active design, e.g. on sign-out', () => {
    useDesignsStore.setState({
      designs: [{ id: 'd1', name: 'x', updated_at: '' }],
      activeDesignId: 'd1',
      activeDesignName: 'x',
      designsError: 'stale error',
    })

    useDesignsStore.getState().reset()

    expect(useDesignsStore.getState()).toMatchObject({
      designs: [],
      activeDesignId: null,
      activeDesignName: null,
      designsError: null,
    })
  })
})
