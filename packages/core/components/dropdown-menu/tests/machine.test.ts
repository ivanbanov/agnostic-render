/**
 * Core spec tests for the DropdownMenu — framework-free.
 *
 * Builds the machine from `dropdownMenuMachineConfig` and drives it through a
 * `connector` (so the snapshot + the onOpenChange reaction are real). No React,
 * no DOM. This is the source-of-truth layer asserting SPEC.md behavior at the
 * agnostic level.
 *
 * Mapping to packages/core/components/dropdown-menu/SPEC.md:
 *   - Opening: click, Enter/Space, ArrowDown (first), ArrowUp (last)
 *   - Closing: trigger click, Escape (via the `escape` event the adapter sends)
 *   - Highlight + keyboard nav: ArrowDown/Up, Home/End, loop
 *   - Item activation: closeOnSelect, checkbox/radio stay open, onSelect cancel
 *   - Typeahead: prefix match, disabled items participate
 *   - Mutual exclusion: only one open
 *   - Accessibility (connect): roles, hasPopup, expanded
 *   - focusTrap: Tab closes (false) vs swallowed (true)
 *
 * Items are threaded per-render via `api.withItems(items)` (the machine reads
 * the ordered list from the event, not context). Parts are flat bags: handlers
 * + attrs live directly on the part (no `.handlers` / `.attrs` nesting).
 * Presentation `data-*` is a VIEW concern and isn't asserted here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DROPDOWN_MENU_DEFAULTS,
  connectDropdownMenu,
  dropdownMenuMachineConfig,
  dropdownMenuStore,
  type DropdownMenuApi,
  type DropdownMenuItemProps,
  type DropdownMenuMachineProps,
  type DropdownMenuProps,
} from '@render-experiment/dropdown-menu-core'
import { connector, machine } from '@render-experiment/machine-core'

// -----------------------------------------------------------------------------
// Harness
// -----------------------------------------------------------------------------

let nextId = 0

const ITEMS: DropdownMenuItemProps[] = [
  { value: 'a', textValue: 'Apple' },
  { value: 'b', textValue: 'Banana' },
  { value: 'c', textValue: 'Cherry' },
]

/** Build + start a menu machine and its connector (defaults resolved as the
 * adapter entry does). */
function make(props: Partial<DropdownMenuProps> = {}) {
  const resolved: DropdownMenuMachineProps = {
    ...DROPDOWN_MENU_DEFAULTS,
    id: `dm${nextId++}`,
    ...props,
  }
  const m = machine(dropdownMenuMachineConfig(resolved))
  const conn = connector(m, connectDropdownMenu, resolved)
  m.start()
  return { m, conn }
}

/** The api a view would see, with the ordered items wired in. */
function api(
  conn: ReturnType<typeof make>['conn'],
  items: DropdownMenuItemProps[] = ITEMS,
): DropdownMenuApi {
  return (conn.snapshot as DropdownMenuApi).withItems(items)
}

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
// Opening
// -----------------------------------------------------------------------------

describe('opening', () => {
  it('clicking the trigger opens', () => {
    const { m, conn } = make()
    api(conn).parts.trigger.onPress?.(undefined as never)
    expect(m.state).toBe('open')
  })

  it('Enter on the trigger opens with first item highlighted', () => {
    const { m, conn } = make()
    api(conn).parts.trigger.onKeyDown?.({ key: 'Enter' } as never)
    expect(m.state).toBe('open')
    // Pending highlight resolves once items are known (withItems → items.ready).
    api(conn, ITEMS)
    expect(m.context.highlightedValue).toBe('a')
  })

  it('ArrowDown on the trigger opens with first item highlighted', () => {
    const { m, conn } = make()
    api(conn).parts.trigger.onKeyDown?.({ key: 'ArrowDown' } as never)
    expect(m.state).toBe('open')
    api(conn, ITEMS)
    expect(m.context.highlightedValue).toBe('a')
  })

  it('ArrowUp on the trigger opens with LAST item highlighted', () => {
    const { m, conn } = make()
    api(conn).parts.trigger.onKeyDown?.({ key: 'ArrowUp' } as never)
    expect(m.state).toBe('open')
    api(conn, ITEMS)
    expect(m.context.highlightedValue).toBe('c')
  })
})

// -----------------------------------------------------------------------------
// Closing
// -----------------------------------------------------------------------------

describe('closing', () => {
  it('clicking the trigger while open closes', () => {
    const { m, conn } = make({ defaultOpen: true })
    api(conn).parts.trigger.onPress?.(undefined as never)
    expect(m.state).toBe('closed')
  })

  it('an `escape` event closes (what the Escape adapter sends)', () => {
    const { m } = make({ defaultOpen: true })
    m.send({ type: 'escape' })
    expect(m.state).toBe('closed')
  })
})

// -----------------------------------------------------------------------------
// Keyboard navigation + highlight
// -----------------------------------------------------------------------------

describe('keyboard navigation', () => {
  it('ArrowDown / ArrowUp move the highlight between enabled items', () => {
    const { m, conn } = make({ defaultOpen: true })
    const content = () => api(conn).parts.content

    content().onKeyDown?.({ key: 'ArrowDown' } as never) // → a
    expect(m.context.highlightedValue).toBe('a')
    content().onKeyDown?.({ key: 'ArrowDown' } as never) // → b
    expect(m.context.highlightedValue).toBe('b')
    content().onKeyDown?.({ key: 'ArrowUp' } as never) // → a
    expect(m.context.highlightedValue).toBe('a')
  })

  it('Home / End jump to first / last enabled item', () => {
    const { m, conn } = make({ defaultOpen: true })
    api(conn).parts.content.onKeyDown?.({ key: 'End' } as never)
    expect(m.context.highlightedValue).toBe('c')
    api(conn).parts.content.onKeyDown?.({ key: 'Home' } as never)
    expect(m.context.highlightedValue).toBe('a')
  })

  it('ArrowUp from the first item wraps to last when loop is enabled (default)', () => {
    const { m, conn } = make({ defaultOpen: true })
    api(conn).parts.content.onKeyDown?.({ key: 'ArrowDown' } as never) // a
    api(conn).parts.content.onKeyDown?.({ key: 'ArrowUp' } as never) // wrap → c
    expect(m.context.highlightedValue).toBe('c')
  })

  it('ArrowUp from the first item stops when loop is disabled', () => {
    const { m, conn } = make({ defaultOpen: true, loop: false })
    api(conn).parts.content.onKeyDown?.({ key: 'ArrowDown' } as never) // a
    api(conn).parts.content.onKeyDown?.({ key: 'ArrowUp' } as never) // stays a
    expect(m.context.highlightedValue).toBe('a')
  })

  it('navigation skips disabled items', () => {
    const items: DropdownMenuItemProps[] = [
      { value: 'a', textValue: 'Apple' },
      { value: 'b', textValue: 'Banana', disabled: true },
      { value: 'c', textValue: 'Cherry' },
    ]
    const { m, conn } = make({ defaultOpen: true })
    api(conn, items).parts.content.onKeyDown?.({ key: 'ArrowDown' } as never) // a
    api(conn, items).parts.content.onKeyDown?.({ key: 'ArrowDown' } as never) // skip b → c
    expect(m.context.highlightedValue).toBe('c')
  })
})

// -----------------------------------------------------------------------------
// Typeahead
// -----------------------------------------------------------------------------

describe('typeahead', () => {
  it('a printable char highlights the first item whose text matches', () => {
    const { m, conn } = make({ defaultOpen: true })
    api(conn).parts.content.onKeyDown?.({ key: 'b' } as never) // Banana
    expect(m.context.highlightedValue).toBe('b')
  })

  it('typeahead can be disabled', () => {
    const { m, conn } = make({ defaultOpen: true, typeahead: false })
    api(conn).parts.content.onKeyDown?.({ key: 'b' } as never)
    expect(m.context.highlightedValue).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// Item activation + closeOnSelect
// -----------------------------------------------------------------------------

describe('item activation', () => {
  it('activating a regular item closes the menu (closeOnSelect default)', () => {
    const { m, conn } = make({ defaultOpen: true })
    api(conn)
      .getItem(ITEMS[0]!)
      .onPress?.(undefined as never)
    expect(m.state).toBe('closed')
  })

  it('closeOnSelect=false on the root keeps the menu open after activation', () => {
    const { m, conn } = make({ defaultOpen: true, closeOnSelect: false })
    api(conn)
      .getItem(ITEMS[0]!)
      .onPress?.(undefined as never)
    expect(m.state).toBe('open')
  })

  it('checkbox items keep the menu open by default', () => {
    const { m, conn } = make({ defaultOpen: true })
    const checkbox: DropdownMenuItemProps = { value: 'x', textValue: 'Toggle', kind: 'checkbox' }
    api(conn, [checkbox])
      .getItem(checkbox)
      .onPress?.(undefined as never)
    expect(m.state).toBe('open')
  })

  it('onSelect preventDefault cancels the close', () => {
    const onSelect = vi.fn((e: { preventDefault: () => void }) => e.preventDefault())
    const item: DropdownMenuItemProps = { value: 'a', textValue: 'Apple', onSelect }
    const { m, conn } = make({ defaultOpen: true })
    api(conn, [item])
      .getItem(item)
      .onPress?.(undefined as never)
    expect(onSelect).toHaveBeenCalled()
    expect(m.state).toBe('open')
  })

  it('disabled items do not activate', () => {
    const onSelect = vi.fn()
    const item: DropdownMenuItemProps = { value: 'a', textValue: 'Apple', disabled: true, onSelect }
    const { m, conn } = make({ defaultOpen: true })
    api(conn, [item])
      .getItem(item)
      .onPress?.(undefined as never)
    expect(onSelect).not.toHaveBeenCalled()
    expect(m.state).toBe('open')
  })
})

// -----------------------------------------------------------------------------
// focusTrap — Tab behavior
// -----------------------------------------------------------------------------

describe('focusTrap', () => {
  it('defaults to false on the connect surface', () => {
    expect(api(make({ defaultOpen: true }).conn).focusTrap).toBe(false)
  })

  it('reflects the resolved prop when true', () => {
    expect(api(make({ defaultOpen: true, focusTrap: true }).conn).focusTrap).toBe(true)
  })

  it('Tab closes the menu when focusTrap is false (default)', () => {
    const { m, conn } = make({ defaultOpen: true })
    // The view's keydown handler sends `close` on Tab in loose mode.
    const event = { key: 'Tab', preventDefault: vi.fn() }
    api(conn).parts.content.onKeyDown?.(event as never)
    expect(m.state).toBe('closed')
    expect(event.preventDefault).not.toHaveBeenCalled()
  })

  it('Tab is swallowed (no close, preventDefault) when focusTrap is true', () => {
    const { m, conn } = make({ defaultOpen: true, focusTrap: true })
    const event = { key: 'Tab', preventDefault: vi.fn() }
    api(conn).parts.content.onKeyDown?.(event as never)
    expect(m.state).toBe('open')
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('Shift+Tab is also swallowed when focusTrap is true', () => {
    const { m, conn } = make({ defaultOpen: true, focusTrap: true })
    const event = { key: 'Tab', shiftKey: true, preventDefault: vi.fn() }
    api(conn).parts.content.onKeyDown?.(event as never)
    expect(m.state).toBe('open')
    expect(event.preventDefault).toHaveBeenCalled()
  })
})

// -----------------------------------------------------------------------------
// Mutual exclusion
// -----------------------------------------------------------------------------

describe('mutual exclusion', () => {
  it('opening a second menu closes the first', () => {
    const first = make()
    api(first.conn).parts.trigger.onPress?.(undefined as never)
    expect(first.m.state).toBe('open')

    const second = make()
    api(second.conn).parts.trigger.onPress?.(undefined as never)

    expect(second.m.state).toBe('open')
    expect(first.m.state).toBe('closed')
  })
})

// -----------------------------------------------------------------------------
// connect — accessibility surface (agnostic bindings; data-* is a view concern)
// -----------------------------------------------------------------------------

describe('connect accessibility surface', () => {
  it('trigger announces a menu popup and expanded state', () => {
    const { m, conn } = make()
    const closed = api(conn).parts.trigger
    expect(closed.role).toBe('button')
    expect(closed.hasPopup).toBe('menu')
    expect(closed.expanded).toBe(false)
    expect(api(conn).open).toBe(false)

    m.send({ type: 'trigger.click', items: ITEMS })
    const open = api(conn).parts.trigger
    expect(open.expanded).toBe(true)
    expect(open.controls).toBe(api(conn).parts.content.id)
    expect(api(conn).open).toBe(true)
  })

  it('content is a vertical menu labelled by the trigger', () => {
    const { conn } = make({ defaultOpen: true })
    const content = api(conn).parts.content
    expect(content.role).toBe('menu')
    expect(content.labelledBy).toBe(api(conn).parts.trigger.id)
  })

  it('items take the right role per kind and are not tab stops', () => {
    const { conn } = make({ defaultOpen: true })
    const a = api(conn)
    expect(a.getItem({ value: 'a' }).role).toBe('menuitem')
    expect(a.getItem({ value: 'b', kind: 'checkbox' }).role).toBe('menuitemcheckbox')
    expect(a.getItem({ value: 'c', kind: 'radio' }).role).toBe('menuitemradio')
    expect(a.getItem({ value: 'a' }).focusable).toBe(false)
  })

  it('the highlighted item reports `highlighted`; disabled reports `disabled`', () => {
    const { conn } = make({ defaultOpen: true })
    api(conn).parts.content.onKeyDown?.({ key: 'ArrowDown' } as never) // highlight a
    const a = api(conn)
    expect(a.getItem({ value: 'a' }).highlighted).toBe(true)
    expect(a.getItem({ value: 'b' }).highlighted).toBe(false)
    expect(a.getItem({ value: 'x', disabled: true }).disabled).toBe(true)
  })

  it('is only `open` while open', () => {
    const { m, conn } = make()
    expect(api(conn).open).toBe(false)
    m.send({ type: 'trigger.click', items: ITEMS })
    expect(api(conn).open).toBe(true)
  })
})
