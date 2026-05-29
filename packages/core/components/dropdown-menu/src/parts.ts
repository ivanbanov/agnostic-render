/**
 * DropdownMenu parts — anatomy + variant types.
 *
 * Names: `parts` (ordered list).
 * Types: each part's variant prop type. Paint lives in
 * @render-experiment/dropdown-menu-shared. Parts with no variants
 * (separator, label, group) don't get a type export.
 */

export const parts = [
  "positioner",
  "content",
  "item",
  "separator",
  "label",
  "group",
] as const;
export type Part = (typeof parts)[number];

export type PositionerVariants = {
  anchored: "true" | "false";
};

export type ContentVariants = {
  side: "top" | "bottom" | "left" | "right";
};

export type ItemVariants = {
  highlighted: "true" | "false";
  disabled: "true" | "false";
};
