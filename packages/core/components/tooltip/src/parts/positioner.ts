/**
 * Positioner — the zero-size anchor box that hosts the content.
 *
 * Variant declaration only (the contract). Style realization lives in
 * `../shared/styles.ts`; adapters consume both.
 */

export type PositionerVariants = {
  anchored: "true" | "false";
};
