import { createContext, useContext, type MutableRefObject } from 'react'
import { View } from 'react-native'
import type { DropdownMenuApi, DropdownMenuItemProps } from '@render-experiment/dropdown-menu-core'

export interface DropdownMenuContextValue {
  api: DropdownMenuApi
  triggerRef: MutableRefObject<View | null>
  anchor: { x: number; y: number; width: number; height: number } | null
  setAnchor: (a: { x: number; y: number; width: number; height: number } | null) => void
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
// Items registry — same shape as the React DOM adapter.
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
// Items-aware api
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
// RadioGroup / ItemChecked
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

export const DropdownMenuItemCheckedRef = createContext<boolean | 'indeterminate'>(false)

export function useDropdownMenuItemChecked() {
  return useContext(DropdownMenuItemCheckedRef)
}
