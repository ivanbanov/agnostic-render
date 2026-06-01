/**
 * Core spec tests for the DropdownMenu — framework-free.
 *
 * Drives `dropdownMenuMachine` via `createMachine` and exercises
 * `connectDropdownMenu` on raw snapshots. No React, no DOM.
 *
 * Mapping to packages/core/components/dropdown-menu/SPEC.md:
 *   - Opening: click, Enter/Space, ArrowDown (first), ArrowUp (last)
 *   - Closing: trigger click, Escape (via event), Tab (focusTrap-dependent)
 *   - Highlight + keyboard nav: ArrowDown/Up, Home/End, loop
 *   - Item activation: closeOnSelect, checkbox/radio stay open, onSelect cancel
 *   - Typeahead: prefix match, disabled items participate
 *   - Mutual exclusion: only one open
 *   - Accessibility (connect): roles, aria-haspopup, data-state
 *   - focusTrap: Tab closes (false) vs swallowed (true)
 *
 * `connector` is curried and takes an `items` extra:
 *   connectDropdownMenu(snapshot)(items)
 * Keyboard/pointer events also carry `items` in their payload, since the
 * machine reads the ordered list from the event rather than context.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  connectDropdownMenu,
  dropdownMenuMachine,
  dropdownMenuStore,
  type DropdownMenuApi,
  type DropdownMenuContext,
  type DropdownMenuItemProps,
  type DropdownMenuProps,
  type DropdownMenuState,
} from '@render-experiment/dropdown-menu-core'
import { createMachine } from '@render-experiment/machine-core'

// -----------------------------------------------------------------------------
// Harness
// -----------------------------------------------------------------------------

let nextId = 0

const ITEMS: DropdownMenuItemProps[] = [
  { value: 'a', textValue: 'Apple' },
  { value: 'b', textValue: 'Banana' },
  { value: 'c', textValue: 'Cherry' },
]

function makeMachine(props: Partial<DropdownMenuProps> = {}) {
  const full: DropdownMenuProps = { id: `dm${nextId++}`, ...props }
  const machine = createMachine(dropdownMenuMachine, full)
  machine.start()
  return machine
}

/** Connect snapshot with a given items list (what the view passes). */
function api(
  machine: ReturnType<typeof makeMachine>,
  items: DropdownMenuItemProps[] = ITEMS,
): DropdownMenuApi {
  return connectDropdownMenu({
    state: machine.getState() as DropdownMenuState,
    context: machine.getContext() as DropdownMenuContext,
    props: machine.getProps(),
    send: machine.send,
  })(items)
}

const ctx = (m: ReturnType<typeof makeMachine>) => m.getContext() as DropdownMenuContext

beforeEach(() => {
  dropdownMenuStore.setOpen(null)
})

afterEach(() => {
  vi.useRealTimers()
})

// -----------------------------------------------------------------------------
// Initial state
// -----------------------------------------------------------------------------

describe('initial state', () => {
  it('starts closed by default', () => {
    expect(makeMachine().getState()).toBe('closed')
  })

  it('starts open when defaultOpen is true', () => {
    expect(makeMachine({ defaultOpen: true }).getState()).toBe('open')
  })

  it('starts open when controlled open is true', () => {
    expect(makeMachine({ open: true }).getState()).toBe('open')
  })
})

// -----------------------------------------------------------------------------
// Opening
// -----------------------------------------------------------------------------

describe('opening', () => {
  it('clicking the trigger opens', () => {
    const m = makeMachine()
    api(m).parts.trigger.handlers.onPress?.(undefined as never)
    expect(m.getState()).toBe('open')
  })

  it('Enter on the trigger opens with first item highlighted', () => {
    const m = makeMachine()
    api(m).parts.trigger.handlers.onKeyDown?.({ key: 'Enter' } as never)
    expect(m.getState()).toBe('open')
    // Pending highlight resolves once items are known (withItems → items.ready).
    api(m).withItems(ITEMS)
    expect(ctx(m).highlightedValue).toBe('a')
  })

  it('ArrowDown on the trigger opens with first item highlighted', () => {
    const m = makeMachine()
    api(m).parts.trigger.handlers.onKeyDown?.({ key: 'ArrowDown' } as never)
    expect(m.getState()).toBe('open')
    api(m).withItems(ITEMS)
    expect(ctx(m).highlightedValue).toBe('a')
  })

  it('ArrowUp on the trigger opens with LAST item highlighted', () => {
    const m = makeMachine()
    api(m).parts.trigger.handlers.onKeyDown?.({ key: 'ArrowUp' } as never)
    expect(m.getState()).toBe('open')
    api(m).withItems(ITEMS)
    expect(ctx(m).highlightedValue).toBe('c')
  })
})

// -----------------------------------------------------------------------------
// Closing
// -----------------------------------------------------------------------------

describe('closing', () => {
  it('clicking the trigger while open closes', () => {
    const m = makeMachine({ defaultOpen: true })
    api(m).parts.trigger.handlers.onPress?.(undefined as never)
    expect(m.getState()).toBe('closed')
  })

  it('an `escape` event closes (what the Escape adapter sends)', () => {
    const m = makeMachine({ defaultOpen: true })
    m.send({ type: 'escape' })
    expect(m.getState()).toBe('closed')
  })
})

// -----------------------------------------------------------------------------
// Keyboard navigation + highlight
// -----------------------------------------------------------------------------

describe('keyboard navigation', () => {
  it('ArrowDown / ArrowUp move the highlight between enabled items', () => {
    const m = makeMachine({ defaultOpen: true })
    const content = () => api(m).parts.content.handlers

    content().onKeyDown?.({ key: 'ArrowDown' } as never) // → a
    expect(ctx(m).highlightedValue).toBe('a')
    content().onKeyDown?.({ key: 'ArrowDown' } as never) // → b
    expect(ctx(m).highlightedValue).toBe('b')
    content().onKeyDown?.({ key: 'ArrowUp' } as never) // → a
    expect(ctx(m).highlightedValue).toBe('a')
  })

  it('Home / End jump to first / last enabled item', () => {
    const m = makeMachine({ defaultOpen: true })
    api(m).parts.content.handlers.onKeyDown?.({ key: 'End' } as never)
    expect(ctx(m).highlightedValue).toBe('c')
    api(m).parts.content.handlers.onKeyDown?.({ key: 'Home' } as never)
    expect(ctx(m).highlightedValue).toBe('a')
  })

  it('ArrowUp from the first item wraps to last when loop is enabled (default)', () => {
    const m = makeMachine({ defaultOpen: true })
    api(m).parts.content.handlers.onKeyDown?.({ key: 'ArrowDown' } as never) // a
    api(m).parts.content.handlers.onKeyDown?.({ key: 'ArrowUp' } as never) // wrap → c
    expect(ctx(m).highlightedValue).toBe('c')
  })

  it('ArrowUp from the first item stops when loop is disabled', () => {
    const m = makeMachine({ defaultOpen: true, loop: false })
    api(m).parts.content.handlers.onKeyDown?.({ key: 'ArrowDown' } as never) // a
    api(m).parts.content.handlers.onKeyDown?.({ key: 'ArrowUp' } as never) // stays a
    expect(ctx(m).highlightedValue).toBe('a')
  })

  it('navigation skips disabled items', () => {
    const items: DropdownMenuItemProps[] = [
      { value: 'a', textValue: 'Apple' },
      { value: 'b', textValue: 'Banana', disabled: true },
      { value: 'c', textValue: 'Cherry' },
    ]
    const m = makeMachine({ defaultOpen: true })
    api(m, items).parts.content.handlers.onKeyDown?.({ key: 'ArrowDown' } as never) // a
    api(m, items).parts.content.handlers.onKeyDown?.({ key: 'ArrowDown' } as never) // skip b → c
    expect(ctx(m).highlightedValue).toBe('c')
  })
})

// -----------------------------------------------------------------------------
// Typeahead
// -----------------------------------------------------------------------------

describe('typeahead', () => {
  it('a printable char highlights the first item whose text matches', () => {
    const m = makeMachine({ defaultOpen: true })
    api(m).parts.content.handlers.onKeyDown?.({ key: 'b' } as never) // Banana
    expect(ctx(m).highlightedValue).toBe('b')
  })

  it('typeahead can be disabled', () => {
    const m = makeMachine({ defaultOpen: true, typeahead: false })
    api(m).parts.content.handlers.onKeyDown?.({ key: 'b' } as never)
    expect(ctx(m).highlightedValue).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// Item activation + closeOnSelect
// -----------------------------------------------------------------------------

describe('item activation', () => {
  it('activating a regular item closes the menu (closeOnSelect default)', () => {
    const m = makeMachine({ defaultOpen: true })
    api(m)
      .getItem(ITEMS[0])
      .handlers.onPress?.(undefined as never)
    expect(m.getState()).toBe('closed')
  })

  it('closeOnSelect=false on the root keeps the menu open after activation', () => {
    const m = makeMachine({ defaultOpen: true, closeOnSelect: false })
    api(m)
      .getItem(ITEMS[0])
      .handlers.onPress?.(undefined as never)
    expect(m.getState()).toBe('open')
  })

  it('checkbox items keep the menu open by default', () => {
    const m = makeMachine({ defaultOpen: true })
    const checkbox: DropdownMenuItemProps = {
      value: 'x',
      textValue: 'Toggle',
      kind: 'checkbox',
    }
    api(m, [checkbox])
      .getItem(checkbox)
      .handlers.onPress?.(undefined as never)
    expect(m.getState()).toBe('open')
  })

  it('onSelect preventDefault cancels the close', () => {
    const onSelect = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    const item: DropdownMenuItemProps = { value: 'a', textValue: 'Apple', onSelect }
    const m = makeMachine({ defaultOpen: true })
    api(m, [item])
      .getItem(item)
      .handlers.onPress?.(undefined as never)
    expect(onSelect).toHaveBeenCalled()
    expect(m.getState()).toBe('open')
  })

  it('disabled items do not activate', () => {
    const onSelect = vi.fn()
    const item: DropdownMenuItemProps = {
      value: 'a',
      textValue: 'Apple',
      disabled: true,
      onSelect,
    }
    const m = makeMachine({ defaultOpen: true })
    api(m, [item])
      .getItem(item)
      .handlers.onPress?.(undefined as never)
    expect(onSelect).not.toHaveBeenCalled()
    expect(m.getState()).toBe('open')
  })
})

// -----------------------------------------------------------------------------
// focusTrap — Tab behavior
// -----------------------------------------------------------------------------

describe('focusTrap', () => {
  it('defaults to false on the connect surface', () => {
    expect(api(makeMachine({ defaultOpen: true })).focusTrap).toBe(false)
  })

  it('reflects the resolved prop when true', () => {
    expect(api(makeMachine({ defaultOpen: true, focusTrap: true })).focusTrap).toBe(true)
  })

  it('Tab closes the menu when focusTrap is false (default)', () => {
    const m = makeMachine({ defaultOpen: true })
    // The view's keydown handler sends `close` on Tab in loose mode.
    const event = { key: 'Tab', preventDefault: vi.fn() }
    api(m).parts.content.handlers.onKeyDown?.(event as never)
    expect(m.getState()).toBe('closed')
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('Tab is swallowed (no close, preventDefault) when focusTrap is true', () => {
    const m = makeMachine({ defaultOpen: true, focusTrap: true })
    const event = { key: 'Tab', preventDefault: vi.fn() }
    api(m).parts.content.handlers.onKeyDown?.(event as never)
    expect(m.getState()).toBe('open')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('Shift+Tab is also swallowed when focusTrap is true', () => {
    const m = makeMachine({ defaultOpen: true, focusTrap: true })
    const event = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() }
    api(m).parts.content.handlers.onKeyDown?.(event as never)
    expect(m.getState()).toBe('open')
    expect(event.preventDefault).toHaveBeenCalled()
  })
})

// -----------------------------------------------------------------------------
// Mutual exclusion
// -----------------------------------------------------------------------------

describe('mutual exclusion', () => {
  it('opening a second menu closes the first', () => {
    const first = makeMachine()
    api(first).parts.trigger.handlers.onPress?.(undefined as never)
    expect(first.getState()).toBe('open')

    const second = makeMachine()
    api(second).parts.trigger.handlers.onPress?.(undefined as never)

    expect(second.getState()).toBe('open')
    expect(first.getState()).toBe('closed')
  })
})

// -----------------------------------------------------------------------------
// connect — accessibility surface
// -----------------------------------------------------------------------------

describe('connect accessibility surface', () => {
  it('trigger announces a menu popup and expanded state', () => {
    const m = makeMachine()
    const closed = api(m).parts.trigger.attrs
    expect(closed.role).toBe('button')
    expect(closed['aria-haspopup']).toBe('menu')
    expect(closed.expanded).toBe(false)
    expect(closed['data-state']).toBe('closed')

    m.send({ type: 'trigger.click', items: ITEMS })
    const open = api(m).parts.trigger.attrs
    expect(open.expanded).toBe(true)
    expect(open['data-state']).toBe('open')
  })

  it('content is a vertical menu labelled by the trigger', () => {
    const m = makeMachine({ defaultOpen: true })
    const content = api(m).parts.content.attrs
    expect(content.role).toBe('menu')
    expect(content['data-orientation']).toBe('vertical')
    expect(content.labelledBy).toBe(api(m).parts.trigger.attrs.id)
  })

  it('items take the right role per kind and are not tab stops', () => {
    const m = makeMachine({ defaultOpen: true })
    const a = api(m)
    expect(a.getItem({ value: 'a' }).attrs.role).toBe('menuitem')
    expect(a.getItem({ value: 'b', kind: 'checkbox' }).attrs.role).toBe('menuitemcheckbox')
    expect(a.getItem({ value: 'c', kind: 'radio' }).attrs.role).toBe('menuitemradio')
    expect(a.getItem({ value: 'a' }).attrs.focusable).toBe(false)
  })

  it('the highlighted item carries data-highlighted; disabled carries data-disabled', () => {
    const m = makeMachine({ defaultOpen: true })
    api(m).parts.content.handlers.onKeyDown?.({ key: 'ArrowDown' } as never) // highlight a
    const a = api(m)
    expect(a.getItem({ value: 'a' }).attrs['data-highlighted']).toBe('')
    expect(a.getItem({ value: 'b' }).attrs['data-highlighted']).toBeUndefined()
    expect(a.getItem({ value: 'x', disabled: true }).attrs['data-disabled']).toBe('')
  })

  it('content is only `rendered` while open', () => {
    const m = makeMachine()
    expect(api(m).parts.content.rendered).toBe(false)
    m.send({ type: 'trigger.click', items: ITEMS })
    expect(api(m).parts.content.rendered).toBe(true)
  })
})
