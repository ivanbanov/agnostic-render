/**
 * Tooltip global store — singleton shared across all tooltip instances:
 * enforces "only one open at a time" + the skip-delay window (a newly hovered
 * tooltip opens instantly right after another closes).
 *
 * Built on machine-core's signal-backed `createStore`; base get/set/subscribe
 * come for free, domain methods are declared inline.
 */

import { createStore } from '@render-experiment/machine-core'

interface TooltipStoreState {
  openId: string | null
  /** When non-null, new tooltips skip openDelay until this timestamp. */
  skipUntil: number | null
}

const initialStore: TooltipStoreState = { openId: null, skipUntil: null }

export const tooltipStore = createStore(initialStore, state => ({
  setOpen: (id: string | null) => state.set({ openId: id }),
  startSkipWindow: (delay: number) => state.set({ skipUntil: Date.now() + delay }),
  endSkipWindow: () => state.set({ skipUntil: null }),
  isInSkipWindow: () => {
    const { skipUntil } = state.get()
    return skipUntil !== null && Date.now() < skipUntil
  },
}))
