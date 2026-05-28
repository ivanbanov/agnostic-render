/**
 * DropdownMenu item — one selectable row in the menu.
 *
 * Functional: highlighted (keyboard focus), disabled (interactive state).
 * Cosmetic: padding, background colors.
 */

import type { Style, StyleSpec } from "@render-experiment/machine-core";

export type ItemVariants = {
  highlighted: "true" | "false";
  disabled: "true" | "false";
};

export const item: StyleSpec<{
  highlighted: Record<"true" | "false", Style>;
  disabled: Record<"true" | "false", Style>;
}> = {
  display: "flex",
  alignItems: "center",
  paddingY: 6,
  paddingX: 12,
  cursor: "default",
  userSelect: "none",
  outline: "none",
  variants: {
    highlighted: {
      true: { background: "#374151" },
      false: { background: "transparent" },
    },
    disabled: {
      true: { opacity: 0.5, cursor: "not-allowed" },
      false: {},
    },
  },
  defaultVariants: {
    highlighted: "false",
    disabled: "false",
  },
};
