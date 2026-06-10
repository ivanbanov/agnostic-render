/**
 * DropdownMenu defaults.
 *
 * Resolution is a plain object spread — `{ ...DROPDOWN_MENU_DEFAULTS, ...props }`
 * applied ONCE at the target entry (generated api.ts). Every prop is flat,
 * so a shallow spread fully resolves them; there is no merge function and no
 * nested `positioning` object to deep-merge.
 *
 * Kept separate from machine.ts so a designer collaborator can read the
 * defaults in isolation, without scrolling past the state machine.
 */

import type { Placement } from './types'

export const DROPDOWN_MENU_DEFAULTS = {
  defaultOpen: false,
  closeOnSelect: true,
  closeOnEscape: true,
  focusTrap: false,
  loop: true,
  typeahead: true,
  dir: 'ltr' as const,
  placement: 'bottom-start' as Placement,
  /** Screen-axis offsets applied to the anchor point (px). */
  offsetX: 0,
  offsetY: 4,
} as const

/** Maximum gap between typeahead keypresses before the buffer resets. */
export const TYPEAHEAD_RESET_MS = 500
