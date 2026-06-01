/**
 * Tooltip — public types.
 *
 * Vocabulary shared across the component's other files (machine.ts,
 * styles.ts) and consumed by adapters. No defaults, no implementation —
 * those live next to the state machine in machine.ts.
 *
 * See SPEC.md for the contract this file implements.
 */

import type { Part } from '@render-experiment/machine-core'
import type { Placement } from '@render-experiment/utils'
import type { TooltipContentVariants } from './parts'

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
 * Optional event payload for the Content's Escape handler. The connect
 * passes through whatever event-like object the adapter's normalize()
 * gave it; the shape is opaque to core. `preventDefault()` cancels the
 * close.
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
  /**
   * Fires when Escape is pressed while open. Call `preventDefault()` to
   * keep the tooltip open. Closed-by-default behavior is preserved.
   */
  onEscapeKeyDown?: (event: TooltipEscapeKeyDownEvent) => void
}

/**
 * Props after defaults are applied (`{ ...TOOLTIP_DEFAULTS, ...props }`),
 * resolved once at the adapter entry. The machine and connect operate on
 * this concrete shape and never re-resolve.
 */
export interface TooltipMachineProps {
  id: string
  /** Optional — no default; absent means uncontrolled. */
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
  /** Optional — callbacks have no default. */
  onOpenChange?: TooltipProps['onOpenChange']
  onEscapeKeyDown?: TooltipProps['onEscapeKeyDown']
}

// -----------------------------------------------------------------------------
// Internal context (machine state)
// -----------------------------------------------------------------------------

export interface TooltipContext {
  /**
   * True after a pointer-driven open. Used to choose `data-state`:
   * `"delayed-open"` for hover/move-driven opens, `"instant-open"` when
   * the skip-delay window fast-tracked the open.
   */
  hasPointerMoveOpened: boolean
  /** True when this open consumed the skip-delay window (vs paid full delay). */
  hasInstantOpen: boolean
  placement: Placement
}

export type TooltipState = 'closed' | 'opening' | 'open' | 'closing'

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

/**
 * Every event the tooltip machine accepts. `src` is an opaque trace tag
 * used in debugging logs / DevTools breadcrumbs.
 */
export type TooltipEvent =
  | { type: 'open'; src?: string }
  | { type: 'close'; src?: string }
  | { type: 'pointer.move' }
  | { type: 'pointer.leave' }
  | { type: 'content.pointer.move' }
  | { type: 'content.pointer.leave' }
  | { type: 'after.openDelay' }
  | { type: 'after.closeDelay' }
  | { type: 'escape'; src?: string }

// -----------------------------------------------------------------------------
// Connect API (consumed by adapter render layer)
// -----------------------------------------------------------------------------

export interface TooltipApi {
  open: boolean
  setOpen: (next: boolean) => void
  parts: {
    trigger: Part
    content: Part<
      TooltipContentVariants,
      { placement: Placement; offsetX: number; offsetY: number; rendered: boolean }
    >
  }
}
