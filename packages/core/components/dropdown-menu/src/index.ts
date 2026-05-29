/**
 * DropdownMenu — public barrel.
 *
 * Every internal name is prefix-scoped (dropdownMenuMachine,
 * DropdownMenuProps, connectDropdownMenu, …), so the barrel re-exports
 * each module with `export *` without fear of collisions.
 *
 * Shared positioning vocabulary (Placement, PositioningOptions, Side,
 * placementToSide) lives in @render-experiment/utils and is re-exported
 * here for component-author convenience.
 */

export * from "./types";
export * from "./props";
export * from "./machine";
export * from "./store";
export * from "./connect";
export * from "./parts";
export * as styles from "@render-experiment/dropdown-menu-shared";
export * from "./utils";
export {
  placementToSide,
  type Placement,
  type PositioningOptions,
  type Side,
} from "@render-experiment/utils";
export type { Style, StyleSpec, StyleValue } from "@render-experiment/machine-core";
