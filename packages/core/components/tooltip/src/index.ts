/**
 * Tooltip — public barrel.
 *
 * Every internal name is already prefix-scoped (tooltipMachine,
 * TooltipProps, connectTooltip, …), so the barrel can re-export each
 * module with `export *` without fear of collisions.
 *
 * Shared positioning vocabulary (Placement, PositioningOptions,
 * placementToSide) lives in machine-core and is re-exported here for
 * component-author convenience.
 */

export * from "./types";
export * from "./props";
export * from "./machine";
export * from "./store";
export * from "./connect";
export * from "./parts";
export * as styles from "@render-experiment/tooltip-shared";
export {
  placementToSide,
  type Placement,
  type PositioningOptions,
  type Style,
  type StyleSpec,
  type StyleValue,
} from "@render-experiment/machine-core";
