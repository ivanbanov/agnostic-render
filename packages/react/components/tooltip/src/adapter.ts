/**
 * React DOM adapter for Tooltip.
 *
 * Implements effects that the core machine declares as placeholders but
 * can't implement portably (DOM listeners, browser-only APIs). The
 * generated api.ts merges this map into the machine via withAdapter()
 * before useMachine.
 */
import type { Adapter } from "@render-experiment/machine-core";
import {
  tooltipProps,
  type TooltipContext,
  type TooltipProps,
} from "@render-experiment/tooltip-core";

export const tooltipAdapter: Adapter<TooltipContext, TooltipProps> = {
  // Listen for Escape while the tooltip is open. Capture-phase so we run
  // before consumer popovers/dialogs that might also listen.
  trackEscapeKey: ({ props, send }) => {
    if (!tooltipProps(props).closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      send({ type: "close", src: "keydown.escape" });
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  },
};
