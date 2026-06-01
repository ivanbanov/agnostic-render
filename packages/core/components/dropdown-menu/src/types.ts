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

import type { AttrBindings, Part } from '@render-experiment/machine-core'
import type { Placement, PositioningOptions } from '@render-experiment/utils'
import type { DropdownMenuContentVariants, DropdownMenuItemVariants } from './parts'

export type { Placement, PositioningOptions }

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

  positioning?: Partial<PositioningOptions>
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
  /** value of the currently-highlighted item, or null. */
  highlightedValue: string | null
  /** When true, pointer-move highlight is paused (during keyboard nav). */
  suspendPointer: boolean
  /** Resolved placement after collision logic (today: just the prop). */
  currentPlacement: Placement
  /** Type-ahead buffer; cleared after a quiet period. */
  typeaheadBuffer: string
  /** Time of last typeahead key — adapters compare to clear the buffer. */
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
// States
// -----------------------------------------------------------------------------

export type DropdownMenuState = 'closed' | 'open'

// -----------------------------------------------------------------------------
// Connect API
// -----------------------------------------------------------------------------

export type DropdownMenuItemPart = Part<DropdownMenuItemVariants, { highlighted: boolean }>

export interface DropdownMenuApi {
  open: boolean
  setOpen: (next: boolean) => void
  /**
   * Resolved focus-trap mode (default false). The render layer reads this
   * to decide whether to refocus the trigger on Tab — see connect's Tab
   * handler. Surfaced here so the default lives in one place (props.ts).
   */
  focusTrap: boolean

  parts: {
    trigger: Part
    content: Part<
      DropdownMenuContentVariants,
      { positioning: PositioningOptions; rendered: boolean }
    >
    /** Static parts — same attrs for every render call. */
    separator: { attrs: AttrBindings }
    label: { attrs: AttrBindings }
    group: { attrs: AttrBindings }
  }

  /** Per-item part producer. */
  getItem: (item: DropdownMenuItemProps) => DropdownMenuItemPart

  /**
   * Re-derive the api with the ordered list of menu items wired into the
   * keyboard / pointer handlers. The render layer calls this with the items
   * it's about to render so that ARROW_DOWN, typeahead, etc. can compute
   * "next item" without storing the list inside the machine context.
   */
  withItems: (items: DropdownMenuItemProps[]) => DropdownMenuApi
}
