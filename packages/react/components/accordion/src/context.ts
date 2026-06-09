import { createContext, useContext } from 'react'
import type { AccordionApi, AccordionItemProps } from '@render-experiment/accordion-core'

/**
 * React context for the accordion. The root provides the api + items registry;
 * Item / Trigger / Content consume. Kept separate from the API hook so the
 * wiring of "machine → React" stays independent from "tree → context".
 */

export interface AccordionContextValue {
  api: AccordionApi
}

export const AccordionContextRef = createContext<AccordionContextValue | null>(null)

export function useAccordionContext(): AccordionContextValue {
  const ctx = useContext(AccordionContextRef)
  if (!ctx) {
    throw new Error('Accordion sub-components must be used inside <Accordion>')
  }
  return ctx
}

// -----------------------------------------------------------------------------
// Items registry — the root reads the ordered list of items rendered as
// descendants and feeds it to api.withItems() so header navigation knows the
// source order. Each item registers on mount, deregisters on unmount. Map
// insertion order = source order.
// -----------------------------------------------------------------------------

export interface AccordionItemRegistry {
  register: (item: AccordionItemProps, key: string) => () => void
  read: () => AccordionItemProps[]
  subscribe: (listener: () => void) => () => void
}

export const AccordionItemRegistryRef = createContext<AccordionItemRegistry | null>(null)

export function useAccordionItemRegistry(): AccordionItemRegistry {
  const ctx = useContext(AccordionItemRegistryRef)
  if (!ctx) {
    throw new Error('Accordion.Item must be used inside <Accordion>')
  }
  return ctx
}

export function createAccordionItemRegistry(): AccordionItemRegistry {
  const items = new Map<string, AccordionItemProps>()
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
// Per-item context — Item publishes its value/disabled so descendant Header /
// Trigger / Content read the same identity without prop-drilling.
// -----------------------------------------------------------------------------

export interface AccordionItemValue {
  value: string
  disabled: boolean
}

export const AccordionItemRef = createContext<AccordionItemValue | null>(null)

export function useAccordionItem(): AccordionItemValue {
  const ctx = useContext(AccordionItemRef)
  if (!ctx) {
    throw new Error('Accordion.Header / Trigger / Content must be used inside <Accordion.Item>')
  }
  return ctx
}
