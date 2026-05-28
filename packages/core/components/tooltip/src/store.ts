/**
 * Tooltip global store — singleton state shared across all tooltip
 * instances. Used to enforce "only one tooltip open at a time" and the
 * skip-delay window that lets a newly-hovered tooltip open instantly
 * after another has just closed.
 *
 * The facade below names the operations so machine effects and the rare
 * external consumer (e.g. test setup that resets between tests) read
 * cleanly.
 */

import { createStore } from "@render-experiment/machine-core";

interface TooltipStoreState {
  openId: string | null;
  /** When non-null, new tooltips skip openDelay until skipUntil. */
  skipUntil: number | null;
}

const store = createStore<TooltipStoreState>({
  openId: null,
  skipUntil: null,
});

export const tooltipStore = {
  get: store.get,
  subscribe: store.subscribe,
  setOpen(id: string | null) {
    store.set((s) => ({ ...s, openId: id }));
  },
  startSkipWindow(ms: number) {
    store.set((s) => ({ ...s, skipUntil: Date.now() + ms }));
  },
  endSkipWindow() {
    store.set((s) => ({ ...s, skipUntil: null }));
  },
  isInSkipWindow() {
    const { skipUntil } = store.get();
    return skipUntil !== null && Date.now() < skipUntil;
  },
};
