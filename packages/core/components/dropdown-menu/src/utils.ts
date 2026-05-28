/**
 * DropdownMenu — component-level helpers.
 */

import type { Placement } from "./types";

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
export function placementToSide(p: Placement): "top" | "bottom" | "left" | "right" {
  return sideMap[p];
}
