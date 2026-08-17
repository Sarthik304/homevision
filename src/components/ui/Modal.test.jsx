// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from './Modal'
import { getColors } from '../../theme'

const color = getColors(false)

describe('Modal', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Test" onClose={onClose} color={color}>
        <div>content</div>
      </Modal>
    )

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on backdrop click but not on a click inside the card', () => {
    const onClose = vi.fn()
    render(
      <Modal title="Test" onClose={onClose} color={color}>
        <div>content</div>
      </Modal>
    )

    fireEvent.click(screen.getByText('content'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('Test').closest('div[style*="position: fixed"]'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not let Escape reach other window-level Escape handlers (e.g. FloorPlanEditor deselect-all)', () => {
    // mirrors how FloorPlanEditor/HouseViewer register their own Escape handlers: a plain
    // bubble-phase window listener, mounted before the modal ever opens
    const otherHandler = vi.fn()
    window.addEventListener('keydown', otherHandler)

    const onClose = vi.fn()
    render(
      <Modal title="Test" onClose={onClose} color={color}>
        <div>content</div>
      </Modal>
    )
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(otherHandler).not.toHaveBeenCalled()

    window.removeEventListener('keydown', otherHandler)
  })

  it('removes its keydown listener on unmount', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Modal title="Test" onClose={onClose} color={color}>
        <div>content</div>
      </Modal>
    )

    unmount()
    fireEvent.keyDown(window, { key: 'Escape' })

    expect(onClose).not.toHaveBeenCalled()
  })
})
