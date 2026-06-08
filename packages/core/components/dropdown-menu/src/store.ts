/**
 * DropdownMenu global store — singleton shared across all menu instances:
 * enforces "only one menu open at a time". Opening one menu sets the global
 * openId; every other instance watches the store and closes when another id
 * claims the slot.
 *
 * Built on machine-core's `createStore`; base get/set/subscribe come for free,
 * domain methods are declared inline. (Mirrors the tooltip store, minus the
 * skip-delay window which is tooltip-specific.)
 */

import { createStore } from '@render-experiment/machine-core'

interface DropdownMenuStoreState {
  openId: string | null
}

const initialStore: DropdownMenuStoreState = { openId: null }

export const dropdownMenuStore = createStore(initialStore, state => ({
  setOpen: (id: string | null) => state.set({ openId: id }),
  isOpen: (id: string) => state.get().openId === id,
}))
