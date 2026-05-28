/**
 * Tooltip elements — the named parts of the component.
 *
 * Each part has its own file in this folder. The barrel below exposes
 * them by name and publishes `parts` (the ordered list) for tooling
 * that needs to enumerate the component's anatomy.
 */

export { content } from "./content";
export type { ContentVariants } from "./content";

export { positioner } from "./positioner";
export type { PositionerVariants } from "./positioner";

/** Ordered list of part names. Mirrors what the codegen iterates. */
export const parts = ["content", "positioner"] as const;
export type Part = (typeof parts)[number];
