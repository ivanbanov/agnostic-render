import { createContext, useContext } from 'react'
import type { AccordionApi } from '@render-experiment/accordion-core'

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
// Per-item context — Item publishes its value/disabled to descendant parts.
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
