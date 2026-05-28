// Machine
export { tooltipMachine, tooltipStore, connect as connectTooltip } from "./machine";

// Types
export type {
  Placement,
  PositioningOptions,
  TooltipApi,
  TooltipContext,
  TooltipProps,
  TooltipState,
} from "./types";

// Props
export { TOOLTIP_DEFAULTS, tooltipProps } from "./props";
export type { ResolvedTooltipProps } from "./props";

// Elements (per-part style specs)
export * as elements from "./elements";
export { content, positioner, parts } from "./elements";
export type { ContentVariants, Part, PositionerVariants } from "./elements";

// Utils
export { placementToSide } from "./utils";

// Re-export shared style types for component-author convenience
export type { Style, StyleSpec, StyleValue } from "@render-experiment/machine-core";
