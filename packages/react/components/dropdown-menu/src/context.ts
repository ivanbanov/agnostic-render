import { createContext, useContext, type RefObject } from "react";
import type {
  DropdownMenuApi,
  MenuItemProps,
} from "@render-experiment/dropdown-menu-core";

/**
 * React context for the menu. The root provides; Trigger/Content/items
 * consume. Kept separate from the API hook so the wiring of "machine →
 * React" stays independent from "tree → context".
 */

export interface DropdownMenuContextValue {
  api: DropdownMenuApi;
  triggerRef: RefObject<HTMLElement | null>;
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
// Items registry — Content reads the ordered list of items rendered as
// descendants, and feeds it to api.withItems(). Each item registers on
// mount, deregisters on unmount. Map insertion order = source order.
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
// Items-aware api context — Content publishes the api enriched with the
// items list so descendant items use the same item-aware handlers.
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
// RadioGroup context
// -----------------------------------------------------------------------------

export interface RadioGroupValue {
  value: string | undefined;
  onValueChange: (next: string) => void;
}

export const RadioGroupContextRef = createContext<RadioGroupValue | null>(null);

export function useRadioGroup(): RadioGroupValue | null {
  return useContext(RadioGroupContextRef);
}

// -----------------------------------------------------------------------------
// ItemChecked context — ItemIndicator reads this to decide whether to render.
// -----------------------------------------------------------------------------

export const ItemCheckedRef = createContext<boolean | "indeterminate">(false);

export function useItemChecked() {
  return useContext(ItemCheckedRef);
}
