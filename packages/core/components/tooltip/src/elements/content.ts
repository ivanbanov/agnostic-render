/**
 * Tooltip content — the painted box that holds the tooltip's children.
 *
 * Today this carries both functional and cosmetic styles. Eventually
 * cosmetic styles (background, color, padding, fontSize, red variant)
 * will move out to consumer-supplied theme; functional styles
 * (position, pointerEvents, side-edge-pinning variant) stay here.
 * That split doesn't exist yet — the merge boundary will land later.
 */

import type { Style, StyleSpec } from "@render-experiment/machine-core";

export type ContentVariants = {
  side: "top" | "bottom" | "left" | "right";
  red: "true" | "false";
  blue: "true" | "false";
};

export const content: StyleSpec<{
  side: Record<"top" | "bottom" | "left" | "right", Style>;
  red: Record<"true" | "false", Style>;
  blue: Record<"true" | "false", Style>;
}> = {
  position: "absolute",
  pointerEvents: "auto",
  background: "#111",
  color: "#fff",
  paddingY: 6,
  paddingX: 10,
  borderRadius: 4,
  fontSize: 13,
  variants: {
    side: {
      // Pin one inner edge of the tooltip to the anchor point. Combined with
      // the {top,left} coords supplied at runtime, this is what makes the
      // tooltip hang off the trigger instead of overlapping it.
      //   side: top    → my BOTTOM edge sits on the anchor → I float above
      //   side: bottom → my TOP edge sits on the anchor    → I float below
      //   side: left   → my RIGHT edge sits on the anchor
      //   side: right  → my LEFT edge sits on the anchor
      top: { bottom: "100%" },
      bottom: { top: "100%" },
      left: { right: "100%" },
      right: { left: "100%" },
    },
    red: {
      true: { background: "#c0392b" },
      false: {},
    },
    blue: {
      true: { background: "#00ff00" },
      false: {},
    },
  },
  defaultVariants: {
    side: "bottom",
    red: "false",
  },
};
