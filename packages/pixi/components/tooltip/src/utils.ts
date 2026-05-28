/**
 * Pixi tooltip render-local helpers — same shape as the React / Native
 * anchorOf, parameterized over a generic Rect (Pixi's getBounds() gives
 * us {x, y, width, height} that we map to top/left/right/bottom).
 */
import type { PositioningOptions } from "@render-experiment/tooltip-core";

export interface Rect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export function anchorOf(
  trigger: Rect,
  positioning: PositioningOptions,
): { x: number; y: number } {
  const { placement } = positioning;
  const { main, cross } = positioning.offset;
  const side = placement.split("-")[0] as "top" | "bottom" | "left" | "right";
  const align = placement.split("-")[1] as "start" | "end" | undefined;
  const sign = align === "end" ? -1 : 1;

  switch (side) {
    case "top": {
      const x =
        align === "start"
          ? trigger.left
          : align === "end"
            ? trigger.right
            : trigger.left + trigger.width / 2;
      return { x: x + cross * sign, y: trigger.top - main };
    }
    case "bottom": {
      const x =
        align === "start"
          ? trigger.left
          : align === "end"
            ? trigger.right
            : trigger.left + trigger.width / 2;
      return { x: x + cross * sign, y: trigger.bottom + main };
    }
    case "left": {
      const y =
        align === "start"
          ? trigger.top
          : align === "end"
            ? trigger.bottom
            : trigger.top + trigger.height / 2;
      return { x: trigger.left - main, y: y + cross * sign };
    }
    case "right": {
      const y =
        align === "start"
          ? trigger.top
          : align === "end"
            ? trigger.bottom
            : trigger.top + trigger.height / 2;
      return { x: trigger.right + main, y: y + cross * sign };
    }
  }
}

/** Convert a Pixi Bounds object to our Rect shape. */
export function boundsToRect(b: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Rect {
  return {
    left: b.x,
    top: b.y,
    right: b.x + b.width,
    bottom: b.y + b.height,
    width: b.width,
    height: b.height,
  };
}

/**
 * Edge-pin a child's local position relative to its parent so the child
 * "hangs off" the anchor in the right direction. Mirrors the
 * `top/right/bottom/left: 100%` trick on the web side.
 *
 *   side: bottom → child's TOP edge sits on parent origin → child at (0, 0)
 *   side: top    → child's BOTTOM edge sits on parent origin → child at (0, -h)
 *   side: right  → child's LEFT edge sits on parent origin → child at (0, 0)
 *   side: left   → child's RIGHT edge sits on parent origin → child at (-w, 0)
 *
 * The anchor placement variant determines centering along the
 * perpendicular axis (e.g., for `bottom`/`top` the child is centered
 * horizontally by shifting by -w/2; for `bottom-start` it's not).
 */
export function edgePinOffset(
  side: "top" | "bottom" | "left" | "right",
  align: "start" | "end" | undefined,
  width: number,
  height: number,
): { x: number; y: number } {
  switch (side) {
    case "top":
      return {
        x: align === "start" ? 0 : align === "end" ? -width : -width / 2,
        y: -height,
      };
    case "bottom":
      return {
        x: align === "start" ? 0 : align === "end" ? -width : -width / 2,
        y: 0,
      };
    case "left":
      return {
        x: -width,
        y: align === "start" ? 0 : align === "end" ? -height : -height / 2,
      };
    case "right":
      return {
        x: 0,
        y: align === "start" ? 0 : align === "end" ? -height : -height / 2,
      };
  }
}
