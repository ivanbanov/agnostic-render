/**
 * Tooltip styles — agnostic, paint-only.
 *
 * Each element of the component (positioner, content, future arrow…)
 * has its own const here. Adapters (React, RN, Surface, …) translate
 * these into their renderer-native styled wrappers.
 *
 * Property naming rule:
 *   - Use CSS names where they map cleanly across renderers.
 *   - For the handful that don't (writing-mode logical inline/block),
 *     use physical-axis equivalents: `paddingX` / `paddingY`. Adapters
 *     expand these.
 *
 * Shape: flat base styles at the top level alongside variants /
 * compoundVariants / defaultVariants — same arrangement Stitches uses.
 */

import type { Placement } from "./types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type StyleValue = string | number | boolean;

export interface Style {
  [prop: string]: StyleValue | StyleValue[];
}

// Flat spec — base style props live at the top level. Variants/etc. live
// alongside them under reserved keys. Loose index signature on purpose:
// the translator inspects each key and decides whether it's a style prop
// or a structural key, so a strict union here would over-constrain authors.
export type StyleSpec<TVariants extends Record<string, Record<string, Style>>> = {
  variants: TVariants;
  compoundVariants?: Array<
    {
      [K in keyof TVariants]?: keyof TVariants[K];
    } & { css: Style }
  >;
  defaultVariants?: { [K in keyof TVariants]?: keyof TVariants[K] };
  [prop: string]: unknown;
};

export type ContentVariants = {
  side: "top" | "bottom" | "left" | "right";
  red: "true" | "false";
};

export type PositionerVariants = {
  anchored: "true" | "false";
};

// -----------------------------------------------------------------------------
// Elements
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
  },
  defaultVariants: {
    side: "bottom",
    red: "false",
  },
};

// The zero-size anchor box that hosts the content. Two static facts
// (position fixed, zero-size) plus an `anchored` variant that toggles
// visibility based on whether the runtime has computed an anchor point
// yet. The anchor coordinates themselves are runtime data, so the React
// layer passes them via `css`.
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

// -----------------------------------------------------------------------------
// Utils
// -----------------------------------------------------------------------------

const sideMap: Record<Placement, "top" | "bottom" | "left" | "right"> = {
  top: "top",
  "top-start": "top",
  "top-end": "top",
  bottom: "bottom",
  "bottom-start": "bottom",
  "bottom-end": "bottom",
  left: "left",
  "left-start": "left",
  "left-end": "left",
  right: "right",
  "right-start": "right",
  "right-end": "right",
};

/** Convert a logical placement to the variant key `content` exposes. */
export function placementToSide(p: Placement) {
  return sideMap[p];
}
