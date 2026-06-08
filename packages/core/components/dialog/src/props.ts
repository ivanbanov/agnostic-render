/**
 * Dialog defaults.
 *
 * Resolution is a plain object spread — `{ ...DIALOG_DEFAULTS, ...props }`
 * applied ONCE at the adapter entry (generated api.ts). Every prop is flat, so a
 * shallow spread fully resolves them.
 *
 * Kept separate from machine.ts so the defaults read in isolation.
 */

export const DIALOG_DEFAULTS = {
  defaultOpen: false,
  /** Modal by default — the rest of the page goes inert while open. */
  modal: true,
  closeOnEscape: true,
  closeOnOutsidePointerDown: true,
} as const
