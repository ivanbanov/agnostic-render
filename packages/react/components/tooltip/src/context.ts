import { createContext, useContext, type RefObject } from "react";
import type { TooltipApi } from "@render-experiment/tooltip-core";

/**
 * React context for the tooltip — the root provides; Trigger/Content
 * consume. Kept separate from the API hook in api.ts so the wiring of
 * "behavior → React" and the wiring of "component tree → context" stay
 * independently editable.
 */

export interface TooltipContextValue {
  api: TooltipApi;
  triggerRef: RefObject<HTMLElement | null>;
}

export const TooltipContextRef = createContext<TooltipContextValue | null>(null);

export function useTooltipContext(): TooltipContextValue {
  const ctx = useContext(TooltipContextRef);
  if (!ctx) {
    throw new Error("Tooltip.Trigger / Tooltip.Content must be used inside <Tooltip>");
  }
  return ctx;
}
