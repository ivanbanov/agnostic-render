/**
 * Pixi dropdown render-local helpers — same anchor math as tooltip-pixi.
 */
import type { PositioningOptions } from "@render-experiment/dropdown-menu-core";

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
