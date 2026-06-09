import type { AttrBindings, EventBindings } from '@render-experiment/machine-core'

// -----------------------------------------------------------------------------
// Caller-facing props (Radix-shaped)
// -----------------------------------------------------------------------------

/** Single-open vs. multi-open. */
export type AccordionType = 'single' | 'multiple'

/** Header navigation axis — picks which arrow keys move between triggers. */
export type AccordionOrientation = 'vertical' | 'horizontal'

export interface AccordionProps {
  /** Stable id for the accordion instance — drives derived element ids. */
  id: string

  /**
   * Expansion mode. `single` keeps at most one item open; `multiple` lets
   * any number open independently. Default `single`.
   */
  type?: AccordionType

  /**
   * For `type: 'single'` only — allow the open item to close itself
   * (so zero items may be open). Default `false`. Ignored in `multiple`.
   */
  collapsible?: boolean

  /** Controlled set of open item values. Undefined = uncontrolled. */
  value?: string[]
  /** Uncontrolled initial set of open item values. */
  defaultValue?: string[]
  onValueChange?: (details: { value: string[] }) => void

  /** Disable the whole accordion — every trigger is inert. */
  disabled?: boolean

  /** Allow keyboard header navigation to wrap around at the boundaries. */
  loop?: boolean

  /** Navigation axis; chooses arrow keys (Up/Down vs Left/Right). Default 'vertical'. */
  orientation?: AccordionOrientation

  /** Reading direction; flips horizontal arrow mapping. Radix-API parity. */
  dir?: 'ltr' | 'rtl'
}

/**
 * Props after defaults are applied (`{ ...ACCORDION_DEFAULTS, ...props }`),
 * resolved once at the adapter entry. The machine and connect operate on this
 * concrete shape and never re-resolve.
 */
export interface AccordionMachineProps {
  id: string
  type: AccordionType
  collapsible: boolean
  value?: string[]
  defaultValue: string[]
  disabled: boolean
  loop: boolean
  orientation: AccordionOrientation
  dir: 'ltr' | 'rtl'
  onValueChange?: AccordionProps['onValueChange']
}

// -----------------------------------------------------------------------------
// Item-level props (each Item the consumer renders supplies these)
// -----------------------------------------------------------------------------

export interface AccordionItemProps {
  /** Stable identifier within this accordion. */
  value: string
  /** When true the trigger is inert and never expands. */
  disabled?: boolean
}

// -----------------------------------------------------------------------------
// Internal context (machine state)
// -----------------------------------------------------------------------------

export interface AccordionContext {
  // --- config the transitions need, seeded from props ONCE at construction ---
  // (the machine never re-reads props; see ARCHITECTURE.md "machine never sees
  // props"). Callbacks + controlled `value` stay on props and are handled by
  // the connector, never here.
  /** Stable id for the accordion instance — drives derived element ids. */
  id: string
  /** Expansion mode. */
  type: AccordionType
  /** Whether single-mode allows closing the open item. */
  collapsible: boolean
  /** Whether the whole accordion is disabled. */
  disabled: boolean
  /** Whether header navigation wraps at the boundaries. */
  loop: boolean
  /** Navigation axis. */
  orientation: AccordionOrientation

  // --- internal state ---
  /** The set of currently-open item values. */
  value: string[]
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

/**
 * Every event the accordion machine accepts. Only the open-set mutates state;
 * header navigation is pure focus movement resolved in connect (it carries no
 * machine state), so it is NOT an event — the view focuses the trigger the
 * connector resolves.
 */
export type AccordionEvent =
  // Toggle a single item open/closed (respects type + collapsible).
  | { type: 'item.toggle'; value: string }
  // Replace the open set wholesale (controlled `value` sync / setValue).
  | { type: 'value.set'; value: string[] }

// -----------------------------------------------------------------------------
// States
// -----------------------------------------------------------------------------

/**
 * The accordion has a single resting state: disclosure is per-item (tracked in
 * `context.value`), not a top-level open/closed mode like the dropdown.
 */
export type AccordionState = 'idle'

// -----------------------------------------------------------------------------
// Computed — derived data (from context + state, never props)
// -----------------------------------------------------------------------------

export interface AccordionComputed {
  /** Derived ids namespaced by instance id (the per-item suffix is applied in connect). */
  rootId: string
}

// -----------------------------------------------------------------------------
// Connect API
// -----------------------------------------------------------------------------

/**
 * A named part — one flat bag the view spreads: event handlers + substrate
 * attributes. The adapter's normalize() maps each key by name. Core emits no
 * `data-*`; each adapter derives whatever `data-*` it wants from the machine
 * state + these fields.
 */
export type AccordionPart = EventBindings & AttrBindings

/**
 * A per-item header/trigger part, plus the `open` / `disabled` flags the view
 * uses for its styling variant + the resolved element ids it wires.
 */
export type AccordionItemPart = {
  /** The collapsible region itself (semantic group wrapper). */
  item: AccordionPart & { open: boolean; disabled: boolean }
  /** The header element wrapping the trigger. */
  header: AccordionPart
  /** The activatable button. */
  trigger: AccordionPart & { open: boolean; disabled: boolean }
  /** The collapsible panel. */
  content: AccordionPart & { open: boolean }
}

/** Header navigation intent — resolved from a key by the connector. */
export type AccordionNavTarget = 'next' | 'prev' | 'first' | 'last'

export interface AccordionApi {
  /** The set of currently-open item values. */
  value: string[]
  /** Replace the open set (routes through controlled/uncontrolled). */
  setValue: (next: string[]) => void

  parts: {
    /** The accordion root container. */
    root: AccordionPart
  }

  /** Per-item part producer — returns the item/header/trigger/content bag. */
  getItem: (item: AccordionItemProps) => AccordionItemPart

  /** The derived DOM id for a given item's trigger (so the view can focus it). */
  triggerId: (value: string) => string

  /**
   * Resolve header navigation: given the currently-focused item value and a nav
   * intent, return the value of the trigger to focus next (or null if none).
   * Disabled items are skipped; `loop` wraps. The view does the actual focus.
   */
  navigate: (from: string, target: AccordionNavTarget) => string | null

  /**
   * Re-derive the api with the ordered list of items wired into the header
   * navigation handlers. The render layer calls this with the items it's about
   * to render so Arrow/Home/End can compute "next trigger" without the machine
   * storing the list.
   */
  withItems: (items: AccordionItemProps[]) => AccordionApi
}
