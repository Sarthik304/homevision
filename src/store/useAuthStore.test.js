import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockAuth = {
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}
vi.mock('../lib/supabaseClient', () => ({
  supabase: { auth: mockAuth },
}))

const mockReset = vi.fn()
vi.mock('./useDesignsStore', () => ({
  default: { getState: () => ({ reset: mockReset }) },
}))

const { default: useAuthStore } = await import('./useAuthStore')

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, initializing: true, authLoading: false, authError: null })
})

describe('init', () => {
  it('adopts any existing session and stops initializing', async () => {
    const user = { id: 'u1', email: 'a@b.com' }
    mockAuth.getSession.mockResolvedValue({ data: { session: { user } } })
    mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })

    useAuthStore.getState().init()
    await Promise.resolve() // flush the getSession() promise

    expect(useAuthStore.getState().user).toEqual(user)
    expect(useAuthStore.getState().initializing).toBe(false)
  })

  it('returns an unsubscribe that tears down the auth-change listener (StrictMode double-invoke safety)', async () => {
    const unsubscribe = vi.fn()
    mockAuth.getSession.mockResolvedValue({ data: { session: null } })
    mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe } } })

    const cleanup = useAuthStore.getState().init()
    await Promise.resolve()
    cleanup()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })

  it('resets the designs store when an auth change signs the user out', () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } })
    let changeHandler
    mockAuth.onAuthStateChange.mockImplementation((cb) => {
      changeHandler = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    useAuthStore.getState().init()
    changeHandler('SIGNED_OUT', null)

    expect(useAuthStore.getState().user).toBeNull()
    expect(mockReset).toHaveBeenCalled()
  })
})

describe('signIn', () => {
  it('reports failure and surfaces the error message', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: { message: 'bad credentials' } })

    const { ok } = await useAuthStore.getState().signIn('a@b.com', 'wrong')

    expect(ok).toBe(false)
    expect(useAuthStore.getState().authError).toBe('bad credentials')
    expect(useAuthStore.getState().authLoading).toBe(false)
  })

  it('reports success and clears any prior error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null })

    const { ok } = await useAuthStore.getState().signIn('a@b.com', 'right')

    expect(ok).toBe(true)
    expect(useAuthStore.getState().authError).toBeNull()
  })
})

describe('signUp', () => {
  it('flags needsConfirmation when sign-up succeeds without an immediate session', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: null }, error: null })

    const { ok, needsConfirmation } = await useAuthStore.getState().signUp('a@b.com', 'secret1')

    expect(ok).toBe(true)
    expect(needsConfirmation).toBe(true)
  })

  it('does not flag needsConfirmation when sign-up returns a session immediately', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: {} }, error: null })

    const { ok, needsConfirmation } = await useAuthStore.getState().signUp('a@b.com', 'secret1')

    expect(ok).toBe(true)
    expect(needsConfirmation).toBe(false)
  })
})
