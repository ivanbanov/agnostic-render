import { createContext, useContext, type RefObject } from 'react'
import type { TooltipApi, TooltipMachineProps } from '@render-experiment/tooltip-core'

export interface TooltipContextValue {
  api: TooltipApi
  props: TooltipMachineProps
  triggerRef: RefObject<HTMLElement | null>
}

export const TooltipContextRef = createContext<TooltipContextValue | null>(null)

export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContextRef)
  if (!ctx) {
    throw new Error('Tooltip.Trigger / Tooltip.Content must be used inside <Tooltip>')
  }
  return ctx
}
