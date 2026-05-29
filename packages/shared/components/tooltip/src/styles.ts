/**
 * Tooltip — substrate-agnostic style specs.
 *
 * One entry per part. Each is a `StyleSpec` consumable by every
 * adapter's translator (style-engine-react/native/pixi). Authored once,
 * realized per-platform.
 *
 * Property naming rule:
 *   - CSS names where they map cleanly across renderers.
 *   - For the handful that don't (writing-mode logical inline/block),
 *     use physical-axis equivalents: paddingX/Y, marginX/Y. Adapters
 *     expand them.
 *
 * Variant types live in ../parts/<name>.ts — the typed contract is
 * separate from the paint that realizes it.
 */

import type { Style, StyleSpec } from "@render-experiment/machine-core";

// -----------------------------------------------------------------------------
// content
// -----------------------------------------------------------------------------

export const content: StyleSpec<{
  side: Record<"top" | "bottom" | "left" | "right", Style>;
  red: Record<"true" | "false", Style>;
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
      // Edge-pin one inner edge to the anchor point. Combined with the
      // {top,left} coords supplied at runtime, this is what makes the
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
  },
  defaultVariants: {
    side: "bottom",
    red: "false",
  },
};

// -----------------------------------------------------------------------------
// positioner
// -----------------------------------------------------------------------------

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
