/**
 * DropdownMenu — public barrel.
 *
 * Every internal name is prefix-scoped (dropdownMenuMachine,
 * DropdownMenuProps, connectDropdownMenu, …), so the barrel re-exports
 * each module with `export *` without fear of collisions.
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
export * as styles from "@render-experiment/dropdown-menu-shared";
export * from "./utils";
export {
  placementToSide,
  type Placement,
  type PositioningOptions,
  type Style,
  type StyleSpec,
  type StyleValue,
} from "@render-experiment/machine-core";
