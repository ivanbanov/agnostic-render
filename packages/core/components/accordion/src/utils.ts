import type { AccordionContext, AccordionItemProps } from './types'

// -----------------------------------------------------------------------------
// Open-set reducer
// -----------------------------------------------------------------------------

/**
 * Compute the next open-set for toggling `value`, honoring the accordion's
 * type + collapsible config.
 *
 * - `multiple` → flip membership of `value`.
 * - `single`   → opening `value` replaces the set with `[value]`; toggling the
 *   already-open item clears the set only when `collapsible` is true (otherwise
 *   it stays open, matching Radix's non-collapsible single accordion).
 */
export function toggleValue(context: AccordionContext, value: string): string[] {
  const isOpen = context.value.includes(value)

  if (context.type === 'multiple') {
    return isOpen ? context.value.filter(v => v !== value) : [...context.value, value]
  }

  // single
  if (isOpen) return context.collapsible ? [] : context.value
  return [value]
}

// -----------------------------------------------------------------------------
// Item walker helpers (header navigation)
// -----------------------------------------------------------------------------

export function firstEnabled(items: AccordionItemProps[]): AccordionItemProps | undefined {
  return items.find(i => !i.disabled)
}

export function lastEnabled(items: AccordionItemProps[]): AccordionItemProps | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i]!.disabled) return items[i]
  }
  return undefined
}

/**
 * Find the next enabled item in `direction` from `current`. Wraps to the other
 * end when `loop` is true. Disabled items are skipped.
 */
export function step(
  items: AccordionItemProps[],
  current: string | null,
  direction: 1 | -1,
  loop: boolean,
): AccordionItemProps | undefined {
  if (items.length === 0) return undefined
  if (current == null) {
    return direction === 1 ? firstEnabled(items) : lastEnabled(items)
  }
  const idx = items.findIndex(i => i.value === current)
  if (idx === -1) return firstEnabled(items)
  let next = idx + direction
  while (next >= 0 && next < items.length) {
    if (!items[next]!.disabled) return items[next]
    next += direction
  }
  if (!loop) return undefined
  return direction === 1 ? firstEnabled(items) : lastEnabled(items)
}
