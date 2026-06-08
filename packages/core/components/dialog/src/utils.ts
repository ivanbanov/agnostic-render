/**
 * Dialog utils — substrate-agnostic veto helpers the target transport calls.
 *
 * Pure logic only: no DOM, no React, no machine internals. Each target wires its
 * own listener (DOM keydown / pointerdown, RN BackHandler) and acts on the
 * verdict these return — so the close DECISION is identical across targets; only
 * the event transport differs.
 *
 *   - resolveEscape — should an Escape press close? (runs the prevent-able veto)
 *   - resolveOutsidePointerDown — should an outside pointer-down close? (ditto)
 */

import type { DialogCancelableEvent, DialogProps, DialogState } from './types'

function runVeto(callback?: (event: DialogCancelableEvent) => void): boolean {
  if (!callback) return false
  let prevented = false
  callback({
    preventDefault: () => {
      prevented = true
    },
    get defaultPrevented() {
      return prevented
    },
  })
  return prevented
}

export interface ResolveEscapeArgs {
  /** The `closeOnEscape` prop. When false, Escape never closes. */
  closeOnEscape: boolean
  /** Current machine state — escape only closes an open dialog. */
  state: DialogState
  /** Consumer veto: `preventDefault()` keeps the dialog open. */
  onEscapeKeyDown?: DialogProps['onEscapeKeyDown']
}

/** Resolve whether an Escape press closes the dialog (after the consumer veto). */
export function resolveEscape({ closeOnEscape, state, onEscapeKeyDown }: ResolveEscapeArgs): {
  close: boolean
} {
  if (!closeOnEscape) return { close: false }
  if (state !== 'open') return { close: false }
  if (runVeto(onEscapeKeyDown)) return { close: false }
  return { close: true }
}

export interface ResolveOutsidePointerDownArgs {
  /** The `closeOnOutsidePointerDown` prop. When false, outside clicks never close. */
  closeOnOutsidePointerDown: boolean
  /** Current machine state — only an open dialog is dismissible. */
  state: DialogState
  /** Consumer veto: `preventDefault()` keeps the dialog open. */
  onPointerDownOutside?: DialogProps['onPointerDownOutside']
}

/** Resolve whether an outside pointer-down closes the dialog (after the veto). */
export function resolveOutsidePointerDown({
  closeOnOutsidePointerDown,
  state,
  onPointerDownOutside,
}: ResolveOutsidePointerDownArgs): { close: boolean } {
  if (!closeOnOutsidePointerDown) return { close: false }
  if (state !== 'open') return { close: false }
  if (runVeto(onPointerDownOutside)) return { close: false }
  return { close: true }
}
