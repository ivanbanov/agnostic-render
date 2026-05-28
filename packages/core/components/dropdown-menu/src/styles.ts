/**
 * DropdownMenu styles — agnostic, paint-only.
 *
 * Property naming rule:
 *   - Use CSS names where they map cleanly across renderers.
 *   - For the handful that don't, use physical-axis equivalents
 *     (paddingX/Y, marginX/Y) — adapters expand them.
 *
 * Shape: flat base styles at the top level alongside variants /
 * compoundVariants / defaultVariants.
 */

import type { Placement } from "./types";

// -----------------------------------------------------------------------------
// Types (same shape as tooltip's)
// -----------------------------------------------------------------------------

export type StyleValue = string | number | boolean;

export interface Style {
  [prop: string]: StyleValue | StyleValue[];
}

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

export type PositionerVariants = {
  anchored: "true" | "false";
};

export type ContentVariants = {
  side: "top" | "bottom" | "left" | "right";
};

export type ItemVariants = {
  highlighted: "true" | "false";
  disabled: "true" | "false";
};

// -----------------------------------------------------------------------------
// Elements
// -----------------------------------------------------------------------------

// Zero-size positioner that hosts the content. Mirrors tooltip's pattern.
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

export const separator: StyleSpec<Record<string, never>> = {
  height: 1,
  marginY: 4,
  marginX: 0,
  background: "#374151",
  variants: {},
};

export const label: StyleSpec<Record<string, never>> = {
  paddingY: 6,
  paddingX: 12,
  fontSize: 11,
  fontWeight: 600,
  color: "#9ca3af",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  variants: {},
};

export const group: StyleSpec<Record<string, never>> = {
  display: "block",
  variants: {},
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
