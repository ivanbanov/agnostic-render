/**
 * DropdownMenu global store — singleton state shared across all menu
 * instances. Used to enforce "only one menu open at a time": opening
 * one closes any other via trackGlobalStore.
 */

import { createStore } from "@render-experiment/machine-core";

interface MenuStoreState {
  openId: string | null;
}

const store = createStore<MenuStoreState>({ openId: null });

export const dropdownMenuStore = {
  get: store.get,
  subscribe: store.subscribe,
  setOpen(id: string | null) {
    store.set((s) => ({ ...s, openId: id }));
  },
};
