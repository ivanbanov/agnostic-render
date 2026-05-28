import { createContext, useContext, type MutableRefObject } from "react";
import { View } from "react-native";
import type {
  DropdownMenuApi,
  MenuItemProps,
} from "@render-experiment/dropdown-menu-core";

export interface DropdownMenuContextValue {
  api: DropdownMenuApi;
  triggerRef: MutableRefObject<View | null>;
  anchor: { x: number; y: number; width: number; height: number } | null;
  setAnchor: (
    a: { x: number; y: number; width: number; height: number } | null,
  ) => void;
}

export const DropdownMenuContextRef =
  createContext<DropdownMenuContextValue | null>(null);

export function useDropdownMenuContext(): DropdownMenuContextValue {
  const ctx = useContext(DropdownMenuContextRef);
  if (!ctx) {
    throw new Error(
      "DropdownMenu sub-components must be used inside <DropdownMenu>",
    );
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// Items registry — same shape as the React DOM adapter.
// -----------------------------------------------------------------------------

export interface ItemRegistry {
  register: (item: MenuItemProps, key: string) => () => void;
  read: () => MenuItemProps[];
  subscribe: (listener: () => void) => () => void;
}

export const ItemRegistryRef = createContext<ItemRegistry | null>(null);

export function useItemRegistry(): ItemRegistry {
  const ctx = useContext(ItemRegistryRef);
  if (!ctx) {
    throw new Error(
      "DropdownMenu.Item must be used inside <DropdownMenu.Content>",
    );
  }
  return ctx;
}

export function createItemRegistry(): ItemRegistry {
  const items = new Map<string, MenuItemProps>();
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());
  return {
    register(item, key) {
      items.set(key, item);
      notify();
      return () => {
        items.delete(key);
        notify();
      };
    },
    read: () => Array.from(items.values()),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// -----------------------------------------------------------------------------
// Items-aware api
// -----------------------------------------------------------------------------

export const CurrentApiRef = createContext<DropdownMenuApi | null>(null);

export function useCurrentApi(): DropdownMenuApi {
  const ctx = useContext(CurrentApiRef);
  if (!ctx) {
    throw new Error(
      "DropdownMenu items must be used inside <DropdownMenu.Content>",
    );
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// RadioGroup / ItemChecked
// -----------------------------------------------------------------------------

export interface RadioGroupValue {
  value: string | undefined;
  onValueChange: (next: string) => void;
}

export const RadioGroupContextRef = createContext<RadioGroupValue | null>(null);

export function useRadioGroup(): RadioGroupValue | null {
  return useContext(RadioGroupContextRef);
}

export const ItemCheckedRef = createContext<boolean | "indeterminate">(false);

export function useItemChecked() {
  return useContext(ItemCheckedRef);
}
