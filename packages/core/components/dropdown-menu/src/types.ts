/**
 * DropdownMenu — public types.
 *
 * Mirrors Radix's DropdownMenu vocabulary (Root / Trigger / Content / Item /
 * Group / Label / Separator / CheckboxItem / RadioGroup / RadioItem /
 * ItemIndicator) so consumers can swap. Out of v1 scope: Sub*, Portal,
 * Arrow.
 *
 * No defaults, no implementation — those live in props.ts and machine.ts.
 */

import type { AttrBindings, EventBindings } from '@render-experiment/machine-core'
import type { Placement, Side } from '@render-experiment/utils'

export type { Placement }

// -----------------------------------------------------------------------------
// Caller-facing props (Radix-shaped)
// -----------------------------------------------------------------------------

export interface DropdownMenuProps {
  /** Stable id for the menu instance. */
  id: string
  /** Controlled open state. Undefined = uncontrolled. */
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (details: { open: boolean }) => void

  /** If false, regular items don't close the menu on activation. Checkbox
   *  and radio items always stay open regardless. */
  closeOnSelect?: boolean
  /** Esc closes the menu. */
  closeOnEscape?: boolean
  /**
   * Keep keyboard focus inside the open menu. When true, Tab / Shift+Tab
   * are swallowed (the menu stays open; Esc or selecting an item exits) —
   * matching Radix/React-Aria's trapped behavior. When false (default),
   * Tab closes the menu and lets focus move to the next tabbable element
   * in document order — the literal W3C APG menu-button behavior.
   */
  focusTrap?: boolean
  /** Allow keyboard navigation to wrap around at boundaries. */
  loop?: boolean
  /** Enable type-ahead character matching. */
  typeahead?: boolean
  /** Direction; affects which arrow keys open/close submenus.
   *  Accepted for Radix-API parity; v1 doesn't act on it. */
  dir?: 'ltr' | 'rtl'

  /** Preferred side/alignment. Default 'bottom-start'. */
  placement?: Placement
  /** Screen-horizontal offset from the anchor point, px. Default 0. */
  offsetX?: number
  /** Screen-vertical offset from the anchor point, px. Default 4. */
  offsetY?: number
}

/**
 * Props after defaults are applied (`{ ...DROPDOWN_MENU_DEFAULTS, ...props }`),
 * resolved once at the target entry. The machine and connect operate on
 * this concrete shape and never re-resolve.
 */
export interface DropdownMenuMachineProps {
  id: string
  open?: boolean
  defaultOpen: boolean
  closeOnSelect: boolean
  closeOnEscape: boolean
  focusTrap: boolean
  loop: boolean
  typeahead: boolean
  dir: 'ltr' | 'rtl'
  placement: Placement
  offsetX: number
  offsetY: number
  onOpenChange?: DropdownMenuProps['onOpenChange']
}

// -----------------------------------------------------------------------------
// Item-level props (each Item the consumer renders supplies these)
// -----------------------------------------------------------------------------

/**
 * The event object passed to an item's `onSelect`. Consumers can call
 * `preventDefault()` to keep the menu open on activation.
 */
export interface DropdownMenuSelectEvent {
  preventDefault: () => void
  defaultPrevented: boolean
}

export interface DropdownMenuItemProps {
  /** Stable identifier within this menu. */
  value: string
  /** Visual text for typeahead matching; defaults to `value` if absent. */
  textValue?: string
  disabled?: boolean
  /** Item kind — controls role + how activation closes the menu. */
  kind?: 'item' | 'checkbox' | 'radio'
  /** For checkbox items. */
  checked?: boolean | 'indeterminate'
  /**
   * Override the default close-on-select behavior for this item.
   * Default: regular items close, checkbox/radio items don't.
   */
  closeOnSelect?: boolean
  /**
   * Activation callback. Receives an event; call `preventDefault()` to
   * keep the menu open regardless of the default close behavior.
   */
  onSelect?: (event: DropdownMenuSelectEvent) => void
}

// -----------------------------------------------------------------------------
// Internal context (machine state)
// -----------------------------------------------------------------------------

export interface DropdownMenuContext {
  // --- config the transitions need, seeded from props ONCE at construction ---
  // (the machine never re-reads props; see ARCHITECTURE.md "machine never sees
  // props"). Callbacks + controlled `open` stay on props and are handled by the
  // connector, never here.
  /** Stable id for the menu instance — drives the derived element ids + store. */
  id: string
  /** Preferred placement (collision flip happens in the view, not here). */
  placement: Placement
  /** Whether keyboard navigation wraps at the boundaries. */
  loop: boolean
  /** Whether typeahead character matching is enabled. */
  typeahead: boolean
  /** Default close-on-select for regular items (per-item override wins). */
  closeOnSelect: boolean

  // --- internal state ---
  /** value of the currently-highlighted item, or null. */
  highlightedValue: string | null
  /** When true, pointer-move highlight is paused (during keyboard nav). */
  suspendPointer: boolean
  /** Type-ahead buffer; cleared after a quiet period. */
  typeaheadBuffer: string
  /** Time of last typeahead key — targets compare to clear the buffer. */
  typeaheadLastTime: number
  /**
   * Set when the menu opens via a keyboard intent ("first" from
   * ArrowDown/Enter/Space, "last" from ArrowUp). The render layer fires
   * an `items.ready` event once items have mounted; the machine applies
   * the highlight then.
   */
  pendingHighlight: 'first' | 'last' | null
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

/**
 * Every event the dropdown machine accepts. Items are threaded through
 * the render layer (not stored in machine context), so most events carry
 * the current item snapshot.
 */
export type DropdownMenuEvent =
  // Opening — closed → open
  | { type: 'open' }
  | { type: 'trigger.click'; items: DropdownMenuItemProps[] }
  | { type: 'trigger.key.open'; items: DropdownMenuItemProps[] }
  | { type: 'trigger.key.open.last'; items: DropdownMenuItemProps[] }
  // Closing — open → closed
  | { type: 'close'; src?: string }
  | { type: 'escape'; src?: string }
  // Item interaction
  | { type: 'item.pointermove'; value: string; items: DropdownMenuItemProps[] }
  | { type: 'item.pointerleave'; value: string; items: DropdownMenuItemProps[] }
  | {
      type: 'item.click'
      value: string
      onSelect?: (event: DropdownMenuSelectEvent) => void
      selectEvent: DropdownMenuSelectEvent
      closeOnSelect: boolean | undefined
      items: DropdownMenuItemProps[]
    }
  // Keyboard navigation inside the open menu
  | { type: 'arrow.down'; items: DropdownMenuItemProps[] }
  | { type: 'arrow.up'; items: DropdownMenuItemProps[] }
  | { type: 'home'; items: DropdownMenuItemProps[] }
  | { type: 'end'; items: DropdownMenuItemProps[] }
  | { type: 'enter'; items: DropdownMenuItemProps[] }
  | { type: 'space'; items: DropdownMenuItemProps[] }
  | { type: 'typeahead.char'; char: string; items: DropdownMenuItemProps[] }
  // Pointer-vs-keyboard highlight arbitration
  | { type: 'pointer.resume' }
  // Items registry notifies the machine after first paint
  | { type: 'items.ready'; items: DropdownMenuItemProps[] }

// -----------------------------------------------------------------------------
// States
// -----------------------------------------------------------------------------

export type DropdownMenuState = 'closed' | 'open'

// -----------------------------------------------------------------------------
// Computed — derived data (from context + state, never props)
// -----------------------------------------------------------------------------

/**
 * Derived values, lazily memoized. Available to guards/actions/effects (via
 * `params.computed`) and to the connect (via the snapshot's `computed` field).
 * All derive from context/state — the machine never reads props.
 */
export interface DropdownMenuComputed {
  /** True iff the machine is in the `open` state. */
  open: boolean
  /** Stable id for the trigger element — derived from `context.id`. */
  triggerId: string
  /** Stable id for the content element — derived from `context.id`. */
  contentId: string
}

// -----------------------------------------------------------------------------
// Connect API
// -----------------------------------------------------------------------------

/**
 * A named part — one flat bag the view spreads: event handlers + substrate
 * attributes. Matches the tooltip's flat part shape; the target's normalize()
 * maps each key by name. Core emits no `data-*`; each target derives whatever
 * `data-*` it wants from the machine state + these fields.
 */
export type DropdownMenuPart = EventBindings & AttrBindings

/**
 * The content part also carries positioning fields the view CONSUMES (reads by
 * name) rather than spreads — render destructures these out before normalize().
 */
export type DropdownMenuContentPart = DropdownMenuPart & {
  side: Side
  placement: Placement
  offsetX: number
  offsetY: number
}

/**
 * A per-item part: the flat handler/attr bag plus the `highlighted` flag the
 * view uses for its styling variant.
 */
export type DropdownMenuItemPart = DropdownMenuPart & {
  highlighted: boolean
  disabled: boolean
}

export interface DropdownMenuApi {
  open: boolean
  setOpen: (next: boolean) => void
  /**
   * Resolved focus-trap mode (default false). The render layer reads this to
   * decide whether to refocus the trigger on Tab — see connect's Tab handler.
   */
  focusTrap: boolean

  parts: {
    trigger: DropdownMenuPart
    content: DropdownMenuContentPart
    /** Static parts — same attrs for every render call. */
    separator: DropdownMenuPart
    label: DropdownMenuPart
    group: DropdownMenuPart
  }

  /** Per-item part producer. */
  getItem: (item: DropdownMenuItemProps) => DropdownMenuItemPart

  /**
   * Re-derive the api with the ordered list of menu items wired into the
   * keyboard / pointer handlers. The render layer calls this with the items
   * it's about to render so ARROW_DOWN, typeahead, etc. can compute "next item"
   * without storing the list inside the machine context.
   */
  withItems: (items: DropdownMenuItemProps[]) => DropdownMenuApi
}
