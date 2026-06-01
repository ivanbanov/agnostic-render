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
import type { Placement } from '@render-experiment/utils'
import type { DropdownMenuContentVariants, DropdownMenuItemVariants } from './parts'

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
 * resolved once at the adapter entry. The machine and connect operate on
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
// Machine vocabulary (the Schema)
// -----------------------------------------------------------------------------

/** Every action name the machine references. */
export type DropdownMenuActions =
  | 'invokeOnOpen'
  | 'invokeOnClose'
  | 'setGlobalId'
  | 'clearGlobalId'
  | 'clearHighlight'
  | 'highlightItem'
  | 'clearHighlightIfMatch'
  | 'suspendPointer'
  | 'resumePointer'
  | 'setPendingFirst'
  | 'setPendingLast'
  | 'clearPendingHighlight'
  | 'applyPendingHighlight'
  | 'highlightFirst'
  | 'highlightLast'
  | 'highlightNext'
  | 'highlightPrev'
  | 'clickHighlightedItem'
  | 'typeaheadMatch'

/** Every guard name the machine references. */
export type DropdownMenuGuards = 'shouldCloseOnSelect'

/** Every effect name the machine references. */
export type DropdownMenuEffects = 'trackEscapeKey' | 'trackGlobalStore'

/**
 * Single source of truth for the dropdown-menu machine — wired into
 * `setup<DropdownMenuSchema>().createMachine({ ... })`. The compiler enforces:
 *   - every name referenced in `entry / exit / actions / effects / guard`
 *     belongs to one of these unions
 *   - every transition `target` is a declared `state`
 *   - `implementations.{actions,guards,effects}` are exhaustive — missing
 *     keys fail, extra keys fail
 */
export type DropdownMenuSchema = {
  context: DropdownMenuContext
  props: DropdownMenuMachineProps
  event: DropdownMenuEvent
  state: DropdownMenuState
  actions: DropdownMenuActions
  guards: DropdownMenuGuards
  effects: DropdownMenuEffects
}

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
      { placement: Placement; offsetX: number; offsetY: number; rendered: boolean }
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
