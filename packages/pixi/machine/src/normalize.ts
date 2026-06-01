/**
 * Translate the machine layer's LOGICAL surface to Pixi event listener pairs.
 *
 * Logical handler → Pixi event name (used with `node.on('pointertap', fn)`)
 * Logical attr    → ignored on Pixi (no a11y on canvas; render layer drops them)
 *
 * Notes:
 *   - Pixi 8 uses Federated Events with names like `pointertap`,
 *     `pointerover`, `pointerout`. `onPress` → `pointertap`.
 *   - `onKeyDown` has no per-node equivalent on Pixi; components that need
 *     keyboard handling subscribe at the `window` level themselves.
 *
 * normalize() takes a logical handlers object and returns a list of
 * (event-name, listener) pairs the render layer iterates over to attach.
 */

const EVENT_MAP: Record<string, string> = {
  onPress: 'pointertap',
  onPointerEnter: 'pointerover',
  onPointerLeave: 'pointerout',
  onPointerMove: 'pointermove',
  onPointerDown: 'pointerdown',
  onPointerUp: 'pointerup',
  onPointerCancel: 'pointercancel',
}

export interface PixiListenerPair {
  event: string
  listener: (event: unknown) => void
}

/** Convert a logical handlers record to a list of Pixi event/listener pairs. */
export function normalize(handlers: Record<string, unknown>): PixiListenerPair[] {
  const pairs: PixiListenerPair[] = []
  for (const [key, value] of Object.entries(handlers)) {
    if (typeof value !== 'function') continue
    const event = EVENT_MAP[key]
    if (!event) continue // onFocus/onBlur/onKeyDown — silently dropped on Pixi
    pairs.push({ event, listener: value as (event: unknown) => void })
  }
  return pairs
}
