import {
  createContext,
  useContext,
  type RefObject,
} from "react";
import { useBehavior } from "@render-experiment/behavior-react";
import {
  connectTooltip,
  tooltipBehavior,
  type TooltipApi,
  type TooltipContext as TooltipBehaviorContext,
  type TooltipProps,
  type TooltipState,
} from "@render-experiment/tooltip-core";

// -----------------------------------------------------------------------------
// Behavior wiring — hook the core service up to React and produce the API
// -----------------------------------------------------------------------------

export function useTooltipApi(props: TooltipProps): TooltipApi {
  const service = useBehavior<TooltipBehaviorContext, TooltipProps>(
    tooltipBehavior,
    props,
  );
  return connectTooltip(
    service.getState() as TooltipState,
    service.getContext(),
    service.getProps(),
    service.send,
  );
}

// -----------------------------------------------------------------------------
// Context — the root provides; Trigger/Content consume
// -----------------------------------------------------------------------------

export interface TooltipContextValue {
  api: TooltipApi;
  triggerRef: RefObject<HTMLElement | null>;
}

export const TooltipContextRef = createContext<TooltipContextValue | null>(
  null,
);

export function useTooltipCtx(): TooltipContextValue {
  const ctx = useContext(TooltipContextRef);
  if (!ctx) {
    throw new Error(
      "Tooltip.Trigger / Tooltip.Content must be used inside <Tooltip>",
    );
  }
  return ctx;
}
