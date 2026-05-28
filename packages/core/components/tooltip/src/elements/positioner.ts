/**
 * Tooltip positioner — the zero-size anchor box that hosts the content.
 *
 * Two structural facts (position fixed, zero-size) plus an `anchored`
 * variant that toggles visibility based on whether the runtime has
 * computed an anchor point yet. The anchor coordinates themselves are
 * runtime data — the React layer passes them via `css`.
 *
 * Everything here is functional. There is no cosmetic style for the
 * positioner because it never paints; it's pure layout glue.
 */

import type { Style, StyleSpec } from "@render-experiment/machine-core";

export type PositionerVariants = {
  anchored: "true" | "false";
};

export const positioner: StyleSpec<{
  anchored: Record<"true" | "false", Style>;
}> = {
  position: "fixed",
  width: 0,
  height: 0,
  variants: {
    anchored: {
      true: { visibility: "visible" },
      false: { visibility: "hidden" },
    },
  },
  defaultVariants: {
    anchored: "false",
  },
};
