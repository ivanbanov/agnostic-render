// Machine
export { dropdownMenuMachine } from "./machine";
export { dropdownMenuStore } from "./store";
export { connect as connectDropdownMenu } from "./connect";

// Types
export type {
  DropdownMenuApi,
  DropdownMenuContext,
  DropdownMenuProps,
  DropdownMenuState,
  MenuItemPart,
  MenuItemProps,
  MenuPart,
  Placement,
  PositioningOptions,
} from "./types";

// Props
export {
  DROPDOWN_MENU_DEFAULTS,
  dropdownMenuProps,
  TYPEAHEAD_RESET_MS,
} from "./props";
export type { ResolvedDropdownMenuProps } from "./props";

// Elements (per-part style specs)
export * as elements from "./elements";
export {
  content,
  group,
  item,
  label,
  parts,
  positioner,
  separator,
} from "./elements";
export type {
  ContentVariants,
  ItemVariants,
  Part,
  PositionerVariants,
} from "./elements";

// Utils
export { placementToSide } from "./utils";

// Re-export shared style types for component-author convenience
export type { Style, StyleSpec, StyleValue } from "@render-experiment/machine-core";
