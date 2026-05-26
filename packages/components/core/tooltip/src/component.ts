/**
 * Tooltip component descriptor — static, agnostic facts about how the
 * tooltip exists in a render tree.
 *
 * These properties aren't style (they don't describe how the box paints)
 * and they aren't behavior (they don't change at runtime). They describe
 * the tooltip's *kind*: where it mounts in the layout, whether it captures
 * pointer input, etc. Each renderer's adapter consumes them at render
 * time to decide structure.
 *
 * Why they live here, not in the style spec:
 *   - `layer` is a structural concern (where to mount), not a visual one.
 *   - `pointerInteractive` is an event-capture concern, not a visual one.
 *
 * Why they live here, not in the behavior:
 *   - They never change. The behavior would return the same value forever.
 *   - The renderer needs them to decide the *shape* of the tree before any
 *     behavior runs.
 */

export interface ComponentDescriptor {
  /**
   * Where in the layout this component lives.
   *   "overlay" — render on top of the page (CSS: position fixed, Surface:
   *               TopLevel, RN: Portal/Modal).
   *   "inline"  — render in document flow (CSS: position static).
   */
  layer: "overlay" | "inline";

  /**
   * Whether the rendered element should receive pointer events.
   *   CSS adapter:    pointerEvents auto/none
   *   Surface/PIXI:   their own hit-test flag
   */
  pointerInteractive: boolean;
}

export const tooltipDescriptor: ComponentDescriptor = {
  layer: "overlay",
  pointerInteractive: true,
};
