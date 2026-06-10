/**
 * Tooltip defaults.
 *
 * Resolution is a plain object spread — `{ ...TOOLTIP_DEFAULTS, ...props }`
 * applied ONCE at the target entry (generated api.ts). Every prop is flat,
 * so a shallow spread fully resolves them; there is no merge function and no
 * nested `positioning` object to deep-merge.
 *
 * Kept separate from machine.ts so a designer collaborator can read the
 * defaults in isolation, without scrolling past the state machine.
 */

import type { Placement } from './types'

export const TOOLTIP_DEFAULTS = {
  defaultOpen: false,
  openDelay: 400,
  closeDelay: 150,
  /**
   * After any tooltip closes, the next tooltip hovered within this many
   * milliseconds opens instantly. 0 disables instant-open entirely.
   */
  skipDelayDuration: 300,
  closeOnEscape: true,
  /** When true, the tooltip closes immediately on pointer leave (no hoverable content). */
  disableHoverableContent: false,
  disabled: false,
  placement: 'bottom' as Placement,
  /** Screen-axis offsets applied to the anchor point (px). */
  offsetX: 0,
  offsetY: 4,
} as const
