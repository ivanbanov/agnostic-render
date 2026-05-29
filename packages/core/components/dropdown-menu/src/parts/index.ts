/**
 * DropdownMenu parts — anatomy + variant types.
 */

export type { ContentVariants } from "./content";
export type { ItemVariants } from "./item";
export type { PositionerVariants } from "./positioner";

export const parts = [
  "positioner",
  "content",
  "item",
  "separator",
  "label",
  "group",
] as const;
export type Part = (typeof parts)[number];
