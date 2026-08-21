// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DeleteAccountSection from './DeleteAccountSection'
import useAuthStore from '../../store/useAuthStore'
import { getColors } from '../../theme'

const color = getColors(false)

beforeEach(() => {
  useAuthStore.setState({
    authLoading: false,
    authError: null,
    deleteAccount: vi.fn(),
    clearAuthError: vi.fn(),
  })
})

describe('DeleteAccountSection', () => {
  it('starts collapsed, showing only the entry-point button', () => {
    render(<DeleteAccountSection savedDesignCount={3} onDeleted={() => {}} color={color} />)

    expect(screen.getByText('Delete my account')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('DELETE')).not.toBeInTheDocument()
  })

  it('the confirm button stays disabled until the confirmation word is typed exactly', () => {
    render(<DeleteAccountSection savedDesignCount={2} onDeleted={() => {}} color={color} />)
    fireEvent.click(screen.getByText('Delete my account'))

    const confirmButton = screen.getByText('Permanently delete account')
    expect(confirmButton).toBeDisabled()

    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'delete' } })
    expect(confirmButton).toBeDisabled() // case-sensitive on purpose — no accidental confirms

    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } })
    expect(confirmButton).toBeEnabled()
  })

  it('calls deleteAccount and onDeleted only once the word is typed and confirmed', async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ ok: true })
    const onDeleted = vi.fn()
    useAuthStore.setState({ deleteAccount })
    render(<DeleteAccountSection savedDesignCount={1} onDeleted={onDeleted} color={color} />)

    fireEvent.click(screen.getByText('Delete my account'))
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } })
    fireEvent.click(screen.getByText('Permanently delete account'))

    expect(deleteAccount).toHaveBeenCalled()
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })

  it('does not call onDeleted when deletion fails', async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ ok: false })
    const onDeleted = vi.fn()
    useAuthStore.setState({ deleteAccount, authError: 'boom' })
    render(<DeleteAccountSection savedDesignCount={1} onDeleted={onDeleted} color={color} />)

    fireEvent.click(screen.getByText('Delete my account'))
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } })
    fireEvent.click(screen.getByText('Permanently delete account'))

    await vi.waitFor(() => expect(deleteAccount).toHaveBeenCalled())
    expect(onDeleted).not.toHaveBeenCalled()
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('cancelling collapses the confirmation and clears any typed text', () => {
    render(<DeleteAccountSection savedDesignCount={1} onDeleted={() => {}} color={color} />)
    fireEvent.click(screen.getByText('Delete my account'))
    fireEvent.change(screen.getByPlaceholderText('DELETE'), { target: { value: 'DELETE' } })

    fireEvent.click(screen.getByText('Cancel'))

    expect(screen.queryByPlaceholderText('DELETE')).not.toBeInTheDocument()
    expect(screen.getByText('Delete my account')).toBeInTheDocument()
  })
})
