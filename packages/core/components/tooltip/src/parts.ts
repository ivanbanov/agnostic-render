/**
 * Tooltip parts — anatomy + variant types.
 *
 * Names: `parts` (ordered list of parts the component renders).
 * Types: each part's variant prop type. Adapters consume these to type
 * their styled wrappers; the actual paint lives in
 * @render-experiment/tooltip-shared.
 */

export const parts = ["positioner", "content"] as const;
export type Part = (typeof parts)[number];

export type PositionerVariants = {
  anchored: "true" | "false";
};

export type ContentVariants = {
  side: "top" | "bottom" | "left" | "right";
  red: "true" | "false";
};
