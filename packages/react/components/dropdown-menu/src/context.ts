import { createContext, useContext, type RefObject } from 'react'
import type { DropdownMenuApi, DropdownMenuItemProps } from '@render-experiment/dropdown-menu-core'

/**
 * React context for the menu. The root provides; Trigger/Content/items
 * consume. Kept separate from the API hook so the wiring of "machine →
 * React" stays independent from "tree → context".
 */

export interface DropdownMenuContextValue {
  api: DropdownMenuApi
  triggerRef: RefObject<HTMLElement | null>
}

export const DropdownMenuContextRef = createContext<DropdownMenuContextValue | null>(null)

export function useDropdownMenuContext(): DropdownMenuContextValue {
  const ctx = useContext(DropdownMenuContextRef)
  if (!ctx) {
    throw new Error('DropdownMenu sub-components must be used inside <DropdownMenu>')
  }
  return ctx
}

// -----------------------------------------------------------------------------
// Items registry — Content reads the ordered list of items rendered as
// descendants, and feeds it to api.withItems(). Each item registers on
// mount, deregisters on unmount. Map insertion order = source order.
// -----------------------------------------------------------------------------

export interface DropdownMenuItemRegistry {
  register: (item: DropdownMenuItemProps, key: string) => () => void
  read: () => DropdownMenuItemProps[]
  subscribe: (listener: () => void) => () => void
}

export const DropdownMenuItemRegistryRef = createContext<DropdownMenuItemRegistry | null>(null)

export function useDropdownMenuItemRegistry(): DropdownMenuItemRegistry {
  const ctx = useContext(DropdownMenuItemRegistryRef)
  if (!ctx) {
    throw new Error('DropdownMenu.Item must be used inside <DropdownMenu.Content>')
  }
  return ctx
}

export function createDropdownMenuItemRegistry(): DropdownMenuItemRegistry {
  const items = new Map<string, DropdownMenuItemProps>()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach(l => l())
  return {
    register(item, key) {
      items.set(key, item)
      notify()
      return () => {
        items.delete(key)
        notify()
      }
    },
    read: () => Array.from(items.values()),
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// -----------------------------------------------------------------------------
// Items-aware api context — Content publishes the api enriched with the
// items list so descendant items use the same item-aware handlers.
// -----------------------------------------------------------------------------

export const DropdownMenuCurrentApiRef = createContext<DropdownMenuApi | null>(null)

export function useDropdownMenuCurrentApi(): DropdownMenuApi {
  const ctx = useContext(DropdownMenuCurrentApiRef)
  if (!ctx) {
    throw new Error('DropdownMenu items must be used inside <DropdownMenu.Content>')
  }
  return ctx
}

// -----------------------------------------------------------------------------
// RadioGroup context
// -----------------------------------------------------------------------------

export interface DropdownMenuRadioGroupValue {
  value: string | undefined
  onValueChange: (next: string) => void
}

export const DropdownMenuRadioGroupContextRef = createContext<DropdownMenuRadioGroupValue | null>(
  null,
)

export function useDropdownMenuRadioGroup(): DropdownMenuRadioGroupValue | null {
  return useContext(DropdownMenuRadioGroupContextRef)
}

// -----------------------------------------------------------------------------
// ItemChecked context — ItemIndicator reads this to decide whether to render.
// -----------------------------------------------------------------------------

export const DropdownMenuItemCheckedRef = createContext<boolean | 'indeterminate'>(false)

export function useDropdownMenuItemChecked() {
  return useContext(DropdownMenuItemCheckedRef)
}
