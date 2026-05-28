/**
 * DropdownMenu positioner — zero-size anchor box that hosts the content.
 * Mirrors tooltip's positioner.
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
