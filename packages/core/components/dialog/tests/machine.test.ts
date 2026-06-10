/**
 * Core spec tests for the Dialog — framework-free.
 *
 * Builds the machine from `dialogMachineConfig` and drives it through a
 * `connector` (so the snapshot + the onOpenChange reaction are real). No React,
 * no DOM. This is the source-of-truth layer asserting SPEC.md behavior at the
 * agnostic level.
 *
 * Mapping to SPEC.md:
 *   - Opening: trigger toggle, controlled/default open
 *   - Closing: close button, escape (via the `escape` event the target's effects.ts sends),
 *     outside pointer-down (via `outside.pointer.down`)
 *   - Escape / outside vetoes: resolveEscape / resolveOutsidePointerDown
 *   - Accessibility (connect): role=dialog, aria-modal, labelledby/describedby
 *   - onOpenChange reaction fires on open/close
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DIALOG_DEFAULTS,
  connectDialog,
  dialogMachineConfig,
  resolveEscape,
  resolveOutsidePointerDown,
  type DialogApi,
  type DialogMachineProps,
  type DialogProps,
} from '@render-experiment/dialog-core'
import { connector, machine } from '@render-experiment/machine-core'

let nextId = 0

function make(props: Partial<DialogProps> = {}) {
  const resolved: DialogMachineProps = { ...DIALOG_DEFAULTS, id: `d${nextId++}`, ...props }
  const m = machine(dialogMachineConfig(resolved))
  const conn = connector(m, connectDialog, resolved)
  m.start()
  return { m, conn }
}

const api = (conn: ReturnType<typeof make>['conn']) => conn.snapshot as DialogApi

afterEach(() => {
  vi.useRealTimers()
})

// -----------------------------------------------------------------------------
// Initial state
// -----------------------------------------------------------------------------

describe('initial state', () => {
  it('starts closed by default', () => {
    expect(make().m.state).toBe('closed')
  })
  it('starts open when defaultOpen is true', () => {
    expect(make({ defaultOpen: true }).m.state).toBe('open')
  })
  it('starts open when controlled open is true', () => {
    expect(make({ open: true }).m.state).toBe('open')
  })
})

// -----------------------------------------------------------------------------
// Opening / closing
// -----------------------------------------------------------------------------

describe('opening + closing', () => {
  it('trigger toggles open then closed', () => {
    const { m, conn } = make()
    api(conn).parts.trigger.onPress?.(undefined as never)
    expect(m.state).toBe('open')
    api(conn).parts.trigger.onPress?.(undefined as never)
    expect(m.state).toBe('closed')
  })

  it('the close button closes', () => {
    const { m, conn } = make({ defaultOpen: true })
    api(conn).parts.close.onPress?.(undefined as never)
    expect(m.state).toBe('closed')
  })

  it('an `escape` event closes (what the Escape listener sends)', () => {
    const { m } = make({ defaultOpen: true })
    m.send({ type: 'escape' })
    expect(m.state).toBe('closed')
  })

  it('an `outside.pointer.down` event closes', () => {
    const { m } = make({ defaultOpen: true })
    m.send({ type: 'outside.pointer.down' })
    expect(m.state).toBe('closed')
  })

  it('setOpen drives open/close', () => {
    const { m, conn } = make()
    api(conn).setOpen(true)
    expect(m.state).toBe('open')
    api(conn).setOpen(false)
    expect(m.state).toBe('closed')
  })
})

// -----------------------------------------------------------------------------
// onOpenChange reaction
// -----------------------------------------------------------------------------

describe('onOpenChange', () => {
  it('fires with open=true then open=false', () => {
    const onOpenChange = vi.fn()
    const { conn } = make({ onOpenChange })
    api(conn).setOpen(true)
    api(conn).setOpen(false)
    expect(onOpenChange.mock.calls).toEqual([[{ open: true }], [{ open: false }]])
  })
})

// -----------------------------------------------------------------------------
// Escape / outside vetoes (pure resolvers — what the target calls)
// -----------------------------------------------------------------------------

describe('resolveEscape', () => {
  it('closes an open dialog when closeOnEscape', () => {
    expect(resolveEscape({ closeOnEscape: true, state: 'open' }).close).toBe(true)
  })
  it('does not close when closeOnEscape is false', () => {
    expect(resolveEscape({ closeOnEscape: false, state: 'open' }).close).toBe(false)
  })
  it('does not close a closed dialog', () => {
    expect(resolveEscape({ closeOnEscape: true, state: 'closed' }).close).toBe(false)
  })
  it('honors preventDefault from onEscapeKeyDown', () => {
    const onEscapeKeyDown = (e: { preventDefault: () => void }) => e.preventDefault()
    expect(resolveEscape({ closeOnEscape: true, state: 'open', onEscapeKeyDown }).close).toBe(false)
  })
})

describe('resolveOutsidePointerDown', () => {
  it('closes an open dialog when enabled', () => {
    expect(
      resolveOutsidePointerDown({ closeOnOutsidePointerDown: true, state: 'open' }).close,
    ).toBe(true)
  })
  it('does not close when disabled', () => {
    expect(
      resolveOutsidePointerDown({ closeOnOutsidePointerDown: false, state: 'open' }).close,
    ).toBe(false)
  })
  it('honors preventDefault from onPointerDownOutside', () => {
    const onPointerDownOutside = (e: { preventDefault: () => void }) => e.preventDefault()
    expect(
      resolveOutsidePointerDown({
        closeOnOutsidePointerDown: true,
        state: 'open',
        onPointerDownOutside,
      }).close,
    ).toBe(false)
  })
})

// -----------------------------------------------------------------------------
// connect — accessibility surface
// -----------------------------------------------------------------------------

describe('connect accessibility surface', () => {
  it('trigger announces a dialog popup + expanded state', () => {
    const { m, conn } = make()
    const closed = api(conn).parts.trigger
    expect(closed.role).toBe('button')
    expect(closed.hasPopup).toBe('dialog')
    expect(closed.expanded).toBe(false)

    m.send({ type: 'open' })
    expect(api(conn).parts.trigger.expanded).toBe(true)
    expect(api(conn).parts.trigger.controls).toBe(api(conn).parts.content.id)
  })

  it('content is a modal dialog labelled + described by its title/description', () => {
    const { conn } = make({ defaultOpen: true })
    const content = api(conn).parts.content
    expect(content.role).toBe('dialog')
    expect(content.modal).toBe(true)
    expect(content.labelledBy).toBe(api(conn).parts.title.id)
    expect(content.describedBy).toBe(api(conn).parts.description.id)
  })

  it('aria-modal is omitted when modal=false', () => {
    const { conn } = make({ defaultOpen: true, modal: false })
    expect(api(conn).parts.content.modal).toBeUndefined()
    expect(api(conn).modal).toBe(false)
  })

  it('overlay is hidden while closed, shown while open', () => {
    const { m, conn } = make()
    expect(api(conn).parts.overlay.hidden).toBe(true)
    m.send({ type: 'open' })
    expect(api(conn).parts.overlay.hidden).toBe(false)
  })
})
