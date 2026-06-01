/**
 * DropdownMenu — component-level helpers.
 *
 * Pure functions: item-list walkers (step, firstEnabled, lastEnabled),
 * typeahead matching, and the printable-character regex. None of these
 * touch the machine or any substrate; they're algorithmic utilities
 * consumed by machine actions and the connect function.
 *
 * Placement vocabulary (Placement, PositioningOptions, placementToSide)
 * lives in machine-core and is re-exported by the package barrel.
 */

import type { DropdownMenuItemProps } from './types'

// -----------------------------------------------------------------------------
// Item walker helpers
// -----------------------------------------------------------------------------

/** Read the `items` payload from an event passed to a machine action. */
export function readItems(event: unknown): DropdownMenuItemProps[] {
  const items = (event as { items?: unknown } | undefined)?.items
  if (!Array.isArray(items)) return []
  return items as DropdownMenuItemProps[]
}

export function firstEnabled(items: DropdownMenuItemProps[]): DropdownMenuItemProps | undefined {
  return items.find(i => !i.disabled)
}

export function lastEnabled(items: DropdownMenuItemProps[]): DropdownMenuItemProps | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i]!.disabled) return items[i]
  }
  return undefined
}

/**
 * Find the next enabled item in `direction` from `current`. Wraps to the
 * other end when `loop` is true.
 */
export function step(
  items: DropdownMenuItemProps[],
  current: string | null,
  direction: 1 | -1,
  loop: boolean,
): DropdownMenuItemProps | undefined {
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

/**
 * Match the typeahead buffer against item textValue/value. Single-char
 * buffer advances past `current` to find the next matching item; longer
 * buffers find the first prefix match.
 */
export function typeaheadFind(
  items: DropdownMenuItemProps[],
  buffer: string,
  current: string | null,
): DropdownMenuItemProps | undefined {
  if (!buffer) return undefined
  const lcBuffer = buffer.toLowerCase()
  const enabled = items.filter(i => !i.disabled)
  const startsWith = (item: DropdownMenuItemProps) =>
    (item.textValue ?? item.value).toLowerCase().startsWith(lcBuffer)

  // Single-char advance from current: cycle past current to the next match.
  if (buffer.length === 1 && current) {
    const currentIdx = enabled.findIndex(i => i.value === current)
    if (currentIdx >= 0) {
      const after = enabled.slice(currentIdx + 1).find(startsWith)
      if (after) return after
    }
  }
  return enabled.find(startsWith)
}

// -----------------------------------------------------------------------------
// Keyboard
// -----------------------------------------------------------------------------

/** Unicode-aware regex for printable characters (typeahead filter). */
export const PRINTABLE_KEY_RE = /^[\p{L}\p{N}\p{P}\p{S} ]$/u

// -----------------------------------------------------------------------------
// Select event
// -----------------------------------------------------------------------------

/**
 * Build the cancelable event object passed to an item's onSelect. The
 * machine reads `defaultPrevented` after the consumer's callback runs
 * to decide whether to close the menu.
 */
export function makeSelectEvent(): {
  preventDefault: () => void
  defaultPrevented: boolean
} {
  let prevented = false
  return {
    preventDefault() {
      prevented = true
    },
    get defaultPrevented() {
      return prevented
    },
  }
}
