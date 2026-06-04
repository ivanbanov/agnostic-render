/**
 * Tooltip utils — substrate-agnostic helpers the target transport calls.
 *
 * Pure logic only: no DOM, no React, no machine internals. Each target wires
 * its own listener (DOM keydown, RN back button) and acts on the verdict these
 * return — so behavior is identical across React, native, and tests; only the
 * event transport differs per target.
 *
 *   - resolveEscape — should an Escape press close? (runs the prevent-able veto)
 */

import type { TooltipProps, TooltipState } from './types'

export interface ResolveEscapeArgs {
  /** The `closeOnEscape` prop. When false, Escape never closes. */
  closeOnEscape: boolean
  /** Current machine state — escape only closes a visible tooltip. */
  state: TooltipState
  /** Consumer veto: `preventDefault()` keeps the tooltip open. */
  onEscapeKeyDown?: TooltipProps['onEscapeKeyDown']
}

/** Resolve whether an Escape press closes the tooltip (after the consumer veto). */
export function resolveEscape({ closeOnEscape, state, onEscapeKeyDown }: ResolveEscapeArgs): {
  close: boolean
} {
  if (!closeOnEscape) return { close: false }
  // Only a visible tooltip (open or closing-out) is dismissible.
  if (state !== 'open' && state !== 'closing') return { close: false }

  if (onEscapeKeyDown) {
    let prevented = false
    onEscapeKeyDown({
      preventDefault: () => {
        prevented = true
      },
      get defaultPrevented() {
        return prevented
      },
    })
    if (prevented) return { close: false }
  }

  return { close: true }
}
