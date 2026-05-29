/**
 * React Native adapter for Tooltip.
 *
 * No substrate effects to override: the core's trackEscapeKey no-op stands.
 * RN has no general hardware Escape key; the Android back button is wired in
 * render.tsx via BackHandler. Left empty intentionally rather than re-stating
 * the no-op.
 */
import type { Adapter } from "@render-experiment/machine-core";
import type {
  TooltipContext,
  TooltipProps,
} from "@render-experiment/tooltip-core";

export const tooltipAdapter: Adapter<TooltipContext, TooltipProps> = {};
