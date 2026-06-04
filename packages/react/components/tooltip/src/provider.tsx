import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { TooltipProviderConfig } from '@render-experiment/tooltip-core'

const TooltipProviderRef = createContext<TooltipProviderConfig | null>(null)

export interface TooltipProviderProps extends TooltipProviderConfig {
  children: ReactNode
}

export function TooltipProvider({ children, ...config }: TooltipProviderProps): React.JSX.Element {
  const value = useMemo<TooltipProviderConfig>(
    () => ({
      openDelay: config.openDelay,
      closeDelay: config.closeDelay,
      skipDelayDuration: config.skipDelayDuration,
      disableHoverableContent: config.disableHoverableContent,
    }),
    [config.openDelay, config.closeDelay, config.skipDelayDuration, config.disableHoverableContent],
  )

  return <TooltipProviderRef.Provider value={value}>{children}</TooltipProviderRef.Provider>
}

export function useTooltipProviderConfig(): TooltipProviderConfig | null {
  return useContext(TooltipProviderRef)
}
