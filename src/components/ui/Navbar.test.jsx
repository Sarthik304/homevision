// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Navbar from './Navbar'
import useHouseStore from '../../store/useHouseStore'
import useAuthStore from '../../store/useAuthStore'
import useDesignsStore from '../../store/useDesignsStore'

const USER = { id: 'user-1', email: 'a@b.com' }

beforeEach(() => {
  useHouseStore.setState({ activeView: '2d', darkMode: false, unit: 'm' })
  useAuthStore.setState({ user: null, initializing: false, signOut: vi.fn() })
  useDesignsStore.setState({
    activeDesignId: null,
    designs: [],
    fetchDesigns: vi.fn(),
  })
})

describe('Navbar "Open share link" button', () => {
  it('is hidden while signed out', () => {
    render(<Navbar />)
    expect(screen.queryByText(/Open share link/)).not.toBeInTheDocument()
  })

  it('is hidden when signed in but the active design is not public', () => {
    useAuthStore.setState({ user: USER })
    useDesignsStore.setState({
      activeDesignId: 'd1',
      designs: [{ id: 'd1', name: 'Mine', updated_at: '', is_public: false }],
    })
    render(<Navbar />)
    expect(screen.queryByText(/Open share link/)).not.toBeInTheDocument()
  })

  it('is hidden when no design is currently active, even if others are public', () => {
    useAuthStore.setState({ user: USER })
    useDesignsStore.setState({
      activeDesignId: null,
      designs: [{ id: 'd1', name: 'Mine', updated_at: '', is_public: true }],
    })
    render(<Navbar />)
    expect(screen.queryByText(/Open share link/)).not.toBeInTheDocument()
  })

  it('opens the active design\'s share link when it is public', () => {
    useAuthStore.setState({ user: USER })
    useDesignsStore.setState({
      activeDesignId: 'd1',
      designs: [{ id: 'd1', name: 'Mine', updated_at: '', is_public: true }],
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    render(<Navbar />)

    fireEvent.click(screen.getByText(/Open share link/))

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('?design=d1'), '_blank', 'noopener')
    openSpy.mockRestore()
  })

  it('fetches the design list on sign-in so it knows the active design\'s public status', () => {
    const fetchDesigns = vi.fn()
    useDesignsStore.setState({ fetchDesigns })
    useAuthStore.setState({ user: USER })

    render(<Navbar />)

    expect(fetchDesigns).toHaveBeenCalledWith(USER.id)
  })
})
