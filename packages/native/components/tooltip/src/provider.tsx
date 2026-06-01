/**
 * App-root provider that hosts the tooltip overlay slot.
 *
 * Usage: wrap your app once.
 *
 *   <TooltipProvider>
 *     <App />
 *   </TooltipProvider>
 *
 * The provider renders an absolutely-positioned, pointer-events-passthrough
 * View on top of children. Tooltip.Content nodes register themselves via
 * the TooltipPortalContext; the provider re-renders to display them.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import type { TooltipProviderConfig } from '@render-experiment/tooltip-core'
import {
  TooltipPortalContext,
  TooltipProviderConfigContext,
  type TooltipPortalEntry,
} from './context'

export interface TooltipProviderProps extends TooltipProviderConfig {
  children: ReactNode
}

export function TooltipProvider({ children, ...config }: TooltipProviderProps) {
  const [entries, setEntries] = useState<TooltipPortalEntry[]>([])

  const mount = useCallback((entry: TooltipPortalEntry) => {
    setEntries(prev => {
      const without = prev.filter(e => e.id !== entry.id)
      return [...without, entry]
    })
  }, [])

  const unmount = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  // Stable config object — see notes in the React TooltipProvider.
  const configValue = useMemo<TooltipProviderConfig>(
    () => ({
      openDelay: config.openDelay,
      closeDelay: config.closeDelay,
      skipDelayDuration: config.skipDelayDuration,
      disableHoverableContent: config.disableHoverableContent,
    }),
    [config.openDelay, config.closeDelay, config.skipDelayDuration, config.disableHoverableContent],
  )

  return (
    <TooltipProviderConfigContext.Provider value={configValue}>
      <TooltipPortalContext.Provider value={{ mount, unmount }}>
        <View style={styles.root}>
          {children}
          <View
            style={styles.overlay}
            pointerEvents='box-none'
            // Pointer-events: box-none lets touches pass through the overlay
            // unless they hit a portal entry directly.
          >
            {entries.map(entry => (
              <View key={entry.id} style={StyleSheet.absoluteFill} pointerEvents='box-none'>
                {entry.node}
              </View>
            ))}
          </View>
        </View>
      </TooltipPortalContext.Provider>
    </TooltipProviderConfigContext.Provider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Explicit absolute-fill (RN 0.85's StyleSheet type doesn't surface
  // `absoluteFillObject`; this is exactly what it expands to).
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
})
