import type { ElementType } from "react";

/**
 * Map a spec's logical `as` value to a real React element type.
 *
 * Strings like "button" / "div" pass through; "@Name" references would be
 * registered here (e.g. `"@Button": MyButton`).
 */
export const primitives: Record<string, ElementType> = {
  button: "button",
  div: "div",
  span: "span",
};

export function resolvePrimitive(as: string): ElementType {
  if (as.startsWith("@")) {
    const ref = primitives[as];
    if (!ref) throw new Error(`unresolved primitive: ${as}`);
    return ref;
  }
  return as as ElementType;
}
