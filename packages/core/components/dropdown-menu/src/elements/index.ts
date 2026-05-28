/**
 * DropdownMenu elements — the named parts of the component.
 */

export { positioner } from "./positioner";
export type { PositionerVariants } from "./positioner";

export { content } from "./content";
export type { ContentVariants } from "./content";

export { item } from "./item";
export type { ItemVariants } from "./item";

export { separator } from "./separator";
export { label } from "./label";
export { group } from "./group";

/** Ordered list of part names. */
export const parts = ["positioner", "content", "item", "separator", "label", "group"] as const;
export type Part = (typeof parts)[number];
