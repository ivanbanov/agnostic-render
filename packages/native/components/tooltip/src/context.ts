/**
 * Portal context for RN tooltips.
 *
 * RN has no DOM portal. The pattern here:
 *
 *   <TooltipProvider>     ← consumer mounts at app root; provides a "slot"
 *     ...                   that overlays the whole tree
 *     <Tooltip>           ← Trigger sets `slotContent` via context when
 *       <Trigger />         the tooltip opens; Provider renders it
 *       <Content />         absolutely positioned on top.
 *     </Tooltip>
 *   </TooltipProvider>
 *
 * Without TooltipProvider the tooltip falls back to inline absolute
 * positioning (clipped by parent overflow — fine for top-level cases).
 */
import { createContext, useContext, type ReactNode } from "react";

export interface PortalEntry {
  id: string;
  node: ReactNode;
}

export interface PortalContextValue {
  /** Mount a tooltip node into the provider's slot. */
  mount: (entry: PortalEntry) => void;
  /** Unmount by id. */
  unmount: (id: string) => void;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

/**
 * Returns the provider's portal API or null if no provider is mounted.
 * Callers fall back to inline rendering when null.
 */
export function usePortal(): PortalContextValue | null {
  return useContext(PortalContext);
}
