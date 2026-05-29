import { createContext, useContext, type RefObject } from "react";
import type { ResolvedTooltipProps, TooltipApi } from "@render-experiment/tooltip-core";

/**
 * React context for the tooltip — the root provides; Trigger/Content
 * consume. Kept separate from the API hook in api.ts so the wiring of
 * "machine → React" and the wiring of "component tree → context" stay
 * independently editable.
 *
 * `props` carries the resolved props through so the view can read
 * configuration without going through the state machine — the machine
 * should only own behavioral state.
 */

export interface TooltipContextValue {
  api: TooltipApi;
  props: ResolvedTooltipProps;
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
