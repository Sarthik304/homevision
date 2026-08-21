// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DesignsPanel from './DesignsPanel'
import useAuthStore from '../../store/useAuthStore'
import useDesignsStore from '../../store/useDesignsStore'
import { getColors } from '../../theme'

const USER = { id: 'user-1', email: 'a@b.com' }
const color = getColors(false)

beforeEach(() => {
  useAuthStore.setState({ user: USER, initializing: false })
  useDesignsStore.setState({
    designs: [
      { id: 'd1', name: 'First floor', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'd2', name: 'Second floor', updated_at: '2026-01-02T00:00:00Z' },
    ],
    loadingDesigns: false,
    savingDesign: false,
    deletingAllDesigns: false,
    designsError: null,
    activeDesignId: null,
    activeDesignName: null,
    setDesignPublic: vi.fn(),
    fetchDesigns: vi.fn(),
  })
})

describe('DesignsPanel', () => {
  it('does not show "Delete all" when there are no saved designs', () => {
    useDesignsStore.setState({ designs: [] })
    render(<DesignsPanel onClose={() => {}} color={color} />)

    expect(screen.queryByText('Delete all')).not.toBeInTheDocument()
  })

  it('asks for confirmation before deleting all designs, and calls the store action for this user', () => {
    const deleteAllDesigns = vi.fn()
    useDesignsStore.setState({ deleteAllDesigns })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<DesignsPanel onClose={() => {}} color={color} />)
    fireEvent.click(screen.getByText('Delete all'))

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('2'))
    expect(deleteAllDesigns).toHaveBeenCalledWith(USER.id)
    confirmSpy.mockRestore()
  })

  it('does not delete anything when the confirmation is declined', () => {
    const deleteAllDesigns = vi.fn()
    useDesignsStore.setState({ deleteAllDesigns })
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<DesignsPanel onClose={() => {}} color={color} />)
    fireEvent.click(screen.getByText('Delete all'))

    expect(deleteAllDesigns).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

describe('sharing a design', () => {
  it('clicking "Share" on a private design marks it public', () => {
    const setDesignPublic = vi.fn()
    useDesignsStore.setState({ setDesignPublic })
    render(<DesignsPanel onClose={() => {}} color={color} />)

    fireEvent.click(screen.getAllByText('Share')[0])

    expect(setDesignPublic).toHaveBeenCalledWith(USER.id, 'd1', true)
  })

  it('shows Open/Copy link only for designs already marked public, and Open opens the right URL', () => {
    useDesignsStore.setState({
      designs: [
        { id: 'd1', name: 'First floor', updated_at: '2026-01-01T00:00:00Z', is_public: false },
        { id: 'd2', name: 'Second floor', updated_at: '2026-01-02T00:00:00Z', is_public: true },
      ],
    })
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    render(<DesignsPanel onClose={() => {}} color={color} />)

    expect(screen.getAllByText('Open')).toHaveLength(1) // only the public one
    fireEvent.click(screen.getByText('Open'))

    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('?design=d2'), '_blank', 'noopener')
    openSpy.mockRestore()
  })

  it('copying the link shows a confirmation on success', async () => {
    useDesignsStore.setState({
      designs: [{ id: 'd1', name: 'First floor', updated_at: '2026-01-01T00:00:00Z', is_public: true }],
    })
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    render(<DesignsPanel onClose={() => {}} color={color} />)

    fireEvent.click(screen.getByText('Copy link'))

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('?design=d1'))
    await screen.findByText('Copied!')
  })

  it('falls back to a manual-copy prompt when the clipboard write fails', async () => {
    useDesignsStore.setState({
      designs: [{ id: 'd1', name: 'First floor', updated_at: '2026-01-01T00:00:00Z', is_public: true }],
    })
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    const promptSpy = vi.spyOn(window, 'prompt').mockImplementation(() => {})
    render(<DesignsPanel onClose={() => {}} color={color} />)

    fireEvent.click(screen.getByText('Copy link'))
    await vi.waitFor(() => expect(promptSpy).toHaveBeenCalled())

    expect(screen.queryByText('Copied!')).not.toBeInTheDocument()
    promptSpy.mockRestore()
  })
})
