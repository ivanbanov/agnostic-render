/**
 * React Native adapter for Tooltip.
 *
 * No-op for trackEscapeKey: RN doesn't have a hardware Escape key for
 * the general case. The Tooltip view wires the Android back button
 * separately via BackHandler (see render.tsx).
 */
import type { Adapter } from "@render-experiment/machine-core";
import type {
  TooltipContext,
  TooltipProps,
} from "@render-experiment/tooltip-core";

export const tooltipAdapter: Adapter<TooltipContext, TooltipProps> = {
  trackEscapeKey: () => undefined,
};
