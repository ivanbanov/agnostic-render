/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Dialog } from '@render-experiment/dialog-react'

/**
 * React DOM tests for the Dialog. Covers the contract in
 * packages/core/components/dialog/SPEC.md: open/close, escape (+ veto),
 * outside pointer-down (+ veto), focus return, the close button, the portal,
 * and the aria wiring (role=dialog, aria-modal, labelledby/describedby).
 */

afterEach(cleanup)

function renderDialog(rootProps = {}) {
  return render(
    <Dialog {...rootProps}>
      <Dialog.Trigger>
        <button>Open</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay data-testid='overlay'>
          <Dialog.Content data-testid='content'>
            <Dialog.Title>Title</Dialog.Title>
            <Dialog.Description>Description</Dialog.Description>
            <button>Inside</button>
            <Dialog.Close>Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog>,
  )
}

describe('open / close', () => {
  it('is closed initially (content not rendered)', () => {
    renderDialog()
    expect(screen.queryByTestId('content')).toBeNull()
  })

  it('opens when the trigger is clicked', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('clicking the trigger again closes it', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    fireEvent.click(screen.getByText('Open'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('respects defaultOpen', () => {
    renderDialog({ defaultOpen: true })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('the close button closes it', () => {
    renderDialog({ defaultOpen: true })
    fireEvent.click(screen.getByText('Close'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('escape', () => {
  it('Escape closes the dialog', () => {
    renderDialog({ defaultOpen: true })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('closeOnEscape={false} keeps it open', () => {
    renderDialog({ defaultOpen: true, closeOnEscape: false })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('onEscapeKeyDown preventDefault vetoes the close', () => {
    const onEscapeKeyDown = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    renderDialog({ defaultOpen: true, onEscapeKeyDown })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onEscapeKeyDown).toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('outside pointer-down', () => {
  it('pointer-down on the overlay (outside content) closes', () => {
    renderDialog({ defaultOpen: true })
    fireEvent.pointerDown(screen.getByTestId('overlay'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('pointer-down inside the content does NOT close', () => {
    renderDialog({ defaultOpen: true })
    fireEvent.pointerDown(screen.getByTestId('content'))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('closeOnOutsidePointerDown={false} keeps it open', () => {
    renderDialog({ defaultOpen: true, closeOnOutsidePointerDown: false })
    fireEvent.pointerDown(screen.getByTestId('overlay'))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('onPointerDownOutside preventDefault vetoes the close', () => {
    const onPointerDownOutside = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    renderDialog({ defaultOpen: true, onPointerDownOutside })
    fireEvent.pointerDown(screen.getByTestId('overlay'))
    expect(onPointerDownOutside).toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('controlled', () => {
  it('seeds initial state from `open` and reports intents via onOpenChange', () => {
    const onOpenChange = vi.fn()
    // Controlled-closed: starts closed (open prop seeds initial state).
    const closed = render(
      <Dialog open={false} onOpenChange={onOpenChange}>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Content>x</Dialog.Content>
        </Dialog.Portal>
      </Dialog>,
    )
    expect(closed.queryByRole('dialog')).toBeNull()
    // Activating the trigger reports the intent to the controller.
    fireEvent.click(screen.getByText('Open'))
    expect(onOpenChange).toHaveBeenCalledWith({ open: true })
    closed.unmount()

    // Controlled-open: a controller that set open=true renders it open.
    const opened = render(
      <Dialog open onOpenChange={onOpenChange}>
        <Dialog.Trigger>
          <button>Open</button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Content>x</Dialog.Content>
        </Dialog.Portal>
      </Dialog>,
    )
    expect(opened.getByRole('dialog')).toBeTruthy()
  })
})

describe('accessibility', () => {
  it('content is a modal dialog labelled + described by its title/description', () => {
    renderDialog({ defaultOpen: true })
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const title = screen.getByText('Title')
    const description = screen.getByText('Description')
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.getAttribute('id'))
    expect(dialog.getAttribute('aria-describedby')).toBe(description.getAttribute('id'))
  })

  it('non-modal omits aria-modal', () => {
    renderDialog({ defaultOpen: true, modal: false })
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBeNull()
  })

  it('trigger reports the dialog popup + expanded while open', () => {
    renderDialog()
    const trigger = screen.getByText('Open')
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
  })
})

describe('focus management', () => {
  it('returns focus to the trigger on close', () => {
    renderDialog()
    const trigger = screen.getByText('Open')
    trigger.focus()
    fireEvent.click(trigger)
    // open: focus moved into the dialog
    expect(document.activeElement).not.toBe(trigger)
    fireEvent.click(screen.getByText('Close'))
    expect(document.activeElement).toBe(trigger)
  })

  it('moves focus into the dialog on open', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    const content = screen.getByTestId('content')
    expect(content.contains(document.activeElement)).toBe(true)
  })

  it('moves initial focus to the first focusable element (a real button)', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    // Interactive parts render as real <button>s, so they're focusable; initial
    // focus lands on the first one, not the content surface.
    expect(document.activeElement?.tagName).toBe('BUTTON')
    expect(document.activeElement?.textContent).toBe('Inside')
  })

  it('traps Tab: wraps from the last focusable to the first', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    const content = screen.getByTestId('content')
    const focusables = Array.from(content.querySelectorAll('button'))
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })

  it('traps Shift+Tab: wraps from the first focusable to the last', () => {
    renderDialog()
    fireEvent.click(screen.getByText('Open'))
    const content = screen.getByTestId('content')
    const focusables = Array.from(content.querySelectorAll('button'))
    const first = focusables[0]!
    const last = focusables[focusables.length - 1]!
    first.focus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
