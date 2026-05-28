/**
 * Pixi adapter for Tooltip.
 *
 * Pixi runs in a browser; window-level keydown is fine. We listen in
 * capture phase so nested overlays don't swallow the Escape first.
 */
import type { Adapter } from "@render-experiment/machine-core";
import {
  tooltipProps,
  type TooltipContext,
  type TooltipProps,
} from "@render-experiment/tooltip-core";

export const tooltipAdapter: Adapter<TooltipContext, TooltipProps> = {
  trackEscapeKey: ({ props, send }) => {
    if (!tooltipProps(props).closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      send({ type: "close", src: "keydown.escape" });
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  },
};
