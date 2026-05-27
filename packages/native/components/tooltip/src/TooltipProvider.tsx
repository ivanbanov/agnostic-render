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
 * the PortalContext; the provider re-renders to display them.
 */
import { useCallback, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { PortalContext, type PortalEntry } from "./context";

export interface TooltipProviderProps {
  children: ReactNode;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  const [entries, setEntries] = useState<PortalEntry[]>([]);

  const mount = useCallback((entry: PortalEntry) => {
    setEntries((prev) => {
      const without = prev.filter((e) => e.id !== entry.id);
      return [...without, entry];
    });
  }, []);

  const unmount = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <PortalContext.Provider value={{ mount, unmount }}>
      <View style={styles.root}>
        {children}
        <View
          style={styles.overlay}
          pointerEvents="box-none"
          // Pointer-events: box-none lets touches pass through the overlay
          // unless they hit a portal entry directly.
        >
          {entries.map((entry) => (
            <View key={entry.id} style={StyleSheet.absoluteFill} pointerEvents="box-none">
              {entry.node}
            </View>
          ))}
        </View>
      </View>
    </PortalContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
});
