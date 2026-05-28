/**
 * DropdownMenu content — the menu surface that hosts items.
 *
 * Today carries both functional (position, edge-pinning, pointerEvents)
 * and cosmetic (background, color, padding, shadow, font, minWidth)
 * styles. Cosmetic will move to consumer theme later; functional stays.
 */

import type { Style, StyleSpec } from "@render-experiment/machine-core";

export type ContentVariants = {
  side: "top" | "bottom" | "left" | "right";
};

export const content: StyleSpec<{
  side: Record<"top" | "bottom" | "left" | "right", Style>;
}> = {
  position: "absolute",
  pointerEvents: "auto",
  background: "#1f2937",
  color: "#fff",
  borderRadius: 6,
  paddingY: 4,
  paddingX: 0,
  fontSize: 13,
  minWidth: 180,
  boxShadow: "0 10px 30px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15)",
  variants: {
    side: {
      top: { bottom: "100%" },
      bottom: { top: "100%" },
      left: { right: "100%" },
      right: { left: "100%" },
    },
  },
  defaultVariants: {
    side: "bottom",
  },
};
