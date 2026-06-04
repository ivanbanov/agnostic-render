/**
 * Tooltip — public types.
 *
 * Under the "machine never sees props" rule: config the transitions need lives
 * in `TooltipContext` (seeded from props at the edge); callbacks + controlled
 * `open` live on `TooltipProps` and are handled by the connector, never the
 * machine.
 *
 * See SPEC.md for the contract this file implements.
 */

import type { AttrBindings, EventBindings } from '@render-experiment/machine-core'
import type { Placement, Side } from '@render-experiment/utils'

export type { Placement }

// -----------------------------------------------------------------------------
// Provider config (subset of TooltipProps; supplies defaults across many)
// -----------------------------------------------------------------------------

/**
 * Provider-level configuration. Inherited by all Roots in the subtree.
 * Every field has a library default if neither Provider nor Root sets it.
 */
export interface TooltipProviderConfig {
  /** Hover dwell before opening, ms. Default 400. */
  openDelay?: number
  /** Grace period after pointer leaves, ms. Default 150. */
  closeDelay?: number
  /**
   * After any tooltip closes, the next tooltip hovered within this window
   * opens instantly (delayed-open → instant-open). Set 0 to disable. Default 300.
   */
  skipDelayDuration?: number
  /** Close immediately when pointer leaves trigger; content is not hoverable. */
  disableHoverableContent?: boolean
}

// -----------------------------------------------------------------------------
// Caller-facing props
// -----------------------------------------------------------------------------

/**
 * Optional event payload for the Content's Escape handler. `preventDefault()`
 * cancels the close.
 */
export interface TooltipEscapeKeyDownEvent {
  preventDefault: () => void
  defaultPrevented: boolean
}

export interface TooltipProps extends TooltipProviderConfig {
  id: string
  /** Controlled open state. Pass `undefined` for uncontrolled. */
  open?: boolean
  defaultOpen?: boolean
  /** Esc dismisses the tooltip. Default true. */
  closeOnEscape?: boolean
  /** When true, all opens are suppressed. */
  disabled?: boolean
  /** Preferred side/alignment. Default 'bottom'. */
  placement?: Placement
  /** Screen-horizontal offset from the anchor point, px. Default 0. */
  offsetX?: number
  /** Screen-vertical offset from the anchor point, px. Default 4. */
  offsetY?: number
  onOpenChange?: (details: { open: boolean }) => void
  /** Fires when Escape is pressed while open. preventDefault() keeps it open. */
  onEscapeKeyDown?: (event: TooltipEscapeKeyDownEvent) => void
}

/**
 * Props after defaults are applied (`{ ...TOOLTIP_DEFAULTS, ...props }`),
 * resolved once at the adapter entry. The connector operates on this concrete
 * shape (controlled `open`, callbacks); the machine does NOT — config fields
 * are seeded into context.
 */
export interface TooltipMachineProps {
  id: string
  open?: boolean
  defaultOpen: boolean
  openDelay: number
  closeDelay: number
  skipDelayDuration: number
  closeOnEscape: boolean
  disableHoverableContent: boolean
  disabled: boolean
  placement: Placement
  offsetX: number
  offsetY: number
  onOpenChange?: TooltipProps['onOpenChange']
  onEscapeKeyDown?: TooltipProps['onEscapeKeyDown']
}

// -----------------------------------------------------------------------------
// Machine context (config the transitions need + internal state)
// -----------------------------------------------------------------------------

/**
 * The machine's context. Config fields (id, placement, delays, …) are seeded
 * from the resolved props at construction; the machine reads them as context,
 * never as props.
 */
export interface TooltipContext {
  id: string
  placement: Placement
  openDelay: number
  closeDelay: number
  skipDelayDuration: number
  disableHoverableContent: boolean
}

export type TooltipState = 'closed' | 'opening' | 'open' | 'closing'

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

export type TooltipEvent =
  | { type: 'open'; src?: string }
  | { type: 'close'; src?: string }
  | { type: 'pointer.move' }
  | { type: 'pointer.leave' }
  | { type: 'content.pointer.move' }
  | { type: 'content.pointer.leave' }
  | { type: 'escape'; src?: string }

// -----------------------------------------------------------------------------
// Connect API (consumed by adapter render layer)
// -----------------------------------------------------------------------------

/**
 * A named part of the component — one flat bag of the things the view spreads
 * onto the element: event handlers (`onPointerMove`, `onFocus`, …) and
 * substrate attributes (`id`, `role`, `describedBy`, `disabled`, aria-*). The
 * adapter's normalize() maps each key by name; there's no handler/attr grouping
 * because nothing downstream needs one.
 *
 * Semantic state (machine state, side) is NOT collapsed into `data-*` here —
 * core stays agnostic; each adapter derives whatever `data-*` it wants from the
 * machine state + the part's own fields (e.g. `side`).
 */
export type TooltipPart = EventBindings & AttrBindings

/**
 * The content part also carries positioning fields the view CONSUMES (reads by
 * name) rather than spreads — render destructures these out before normalize().
 */
export type TooltipContentPart = TooltipPart & {
  side: Side
  placement: Placement
  offsetX: number
  offsetY: number
}

export interface TooltipApi {
  open: boolean
  setOpen: (next: boolean) => void
  parts: {
    trigger: TooltipPart
    content: TooltipContentPart
  }
}
