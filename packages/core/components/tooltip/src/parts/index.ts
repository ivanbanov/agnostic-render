/**
 * Tooltip parts — anatomy + variant types.
 *
 * Names: `parts` (ordered list of parts the component renders).
 * Types: each part's variant prop type. Adapters consume these to type
 * their styled wrappers; the actual paint lives in ../shared/styles.ts.
 */

export type { ContentVariants } from "./content";
export type { PositionerVariants } from "./positioner";

export const parts = ["positioner", "content"] as const;
export type Part = (typeof parts)[number];
