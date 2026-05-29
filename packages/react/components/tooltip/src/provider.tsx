/**
 * <Tooltip.Provider> — supplies inherited timing / hoverable-content
 * defaults to all tooltips in the subtree.
 *
 * Optional: tooltips without a Provider use the library defaults
 * (openDelay 400, closeDelay 150, skipDelayDuration 300,
 * disableHoverableContent false).
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { TooltipProviderConfig } from "@render-experiment/tooltip-core";

const TooltipProviderRef =
  createContext<TooltipProviderConfig | null>(null);

export interface TooltipProviderProps extends TooltipProviderConfig {
  children: ReactNode;
}

export function TooltipProvider({
  children,
  ...config
}: TooltipProviderProps): React.JSX.Element {
  // Stable config object so context consumers don't re-render on every
  // parent render. The set of provider props is small and rarely changes;
  // memoize against each field individually.
  const value = useMemo<TooltipProviderConfig>(
    () => ({
      openDelay: config.openDelay,
      closeDelay: config.closeDelay,
      skipDelayDuration: config.skipDelayDuration,
      disableHoverableContent: config.disableHoverableContent,
    }),
    [
      config.openDelay,
      config.closeDelay,
      config.skipDelayDuration,
      config.disableHoverableContent,
    ],
  );
  return (
    <TooltipProviderRef.Provider value={value}>
      {children}
    </TooltipProviderRef.Provider>
  );
}

/**
 * Read the nearest TooltipProvider config. Returns null when no
 * Provider is mounted — callers should fall back to lib defaults via
 * the prop resolver (TooltipRoot does this implicitly).
 */
export function useTooltipProviderConfig(): TooltipProviderConfig | null {
  return useContext(TooltipProviderRef);
}
