// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SharedDesignBanner from './SharedDesignBanner'
import useHouseStore from '../../store/useHouseStore'
import useAuthStore from '../../store/useAuthStore'
import useDesignsStore from '../../store/useDesignsStore'

const SHARED = { id: 'shared-1', name: "Jane's Apartment" }

beforeEach(() => {
  useHouseStore.setState({ darkMode: false })
  useAuthStore.setState({ user: null, initializing: false })
  useDesignsStore.setState({
    sharedDesign: null,
    sharedDesignError: null,
    savingDesign: false,
    clearSharedDesign: vi.fn(),
    saveDesign: vi.fn(),
  })
})

describe('SharedDesignBanner', () => {
  it('renders nothing when no shared design is loaded', () => {
    const { container } = render(<SharedDesignBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a sign-in prompt when viewing a shared design while signed out', () => {
    useDesignsStore.setState({ sharedDesign: SHARED })
    render(<SharedDesignBanner />)

    expect(screen.getByText(/Jane's Apartment/)).toBeInTheDocument()
    expect(screen.getByText('Sign in to save a copy')).toBeInTheDocument()
  })

  it('opens the sign-in modal instead of saving when signed out', () => {
    useDesignsStore.setState({ sharedDesign: SHARED })
    render(<SharedDesignBanner />)

    fireEvent.click(screen.getByText('Sign in to save a copy'))

    expect(screen.getByText('Sign in', { selector: 'span' })).toBeInTheDocument()
    expect(useDesignsStore.getState().saveDesign).not.toHaveBeenCalled()
  })

  it('saves a copy under the signed-in user and shows a confirmation', async () => {
    const saveDesign = vi.fn().mockResolvedValue(true)
    useAuthStore.setState({ user: { id: 'user-1' } })
    useDesignsStore.setState({ sharedDesign: SHARED, saveDesign })

    render(<SharedDesignBanner />)
    fireEvent.click(screen.getByText('Save a copy'))

    expect(saveDesign).toHaveBeenCalledWith('user-1', SHARED.name)
    await screen.findByText(/Saved "Jane's Apartment"/)
  })

  it('shows a broken-link message, with no Save button, when the shared design failed to load', () => {
    useDesignsStore.setState({ sharedDesignError: "This design isn't available — it may have been unshared or deleted." })
    render(<SharedDesignBanner />)

    expect(screen.getByText(/isn't available/)).toBeInTheDocument()
    expect(screen.queryByText('Save a copy')).not.toBeInTheDocument()
    expect(screen.queryByText('Sign in to save a copy')).not.toBeInTheDocument()
  })

  it('dismissing clears the shared-design state', () => {
    const clearSharedDesign = vi.fn()
    useDesignsStore.setState({ sharedDesign: SHARED, clearSharedDesign })
    render(<SharedDesignBanner />)

    fireEvent.click(screen.getByLabelText('Dismiss'))

    expect(clearSharedDesign).toHaveBeenCalled()
  })
})
