/**
 * DropdownMenu render-local helpers.
 *
 * Same shape as tooltip's utils — candidate for extraction to a shared
 * package once enough components reuse them.
 */
import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import type { PositioningOptions } from '@render-experiment/dropdown-menu-core'

export function cloneOnly(node: ReactNode, props: Record<string, unknown>) {
  const only = Children.only(node)
  if (!isValidElement(only)) return only
  const element = only as ReactElement<Record<string, unknown>>
  return cloneElement(element, { ...element.props, ...props })
}

export function getChildRef(
  node: ReactNode,
): ((el: HTMLElement | null) => void) | RefObject<HTMLElement | null> | null {
  const only = Children.only(node)
  if (!isValidElement(only)) return null
  const props = only.props as Record<string, unknown>
  const ref = props.ref
  if (typeof ref === 'function' || (ref && typeof ref === 'object')) {
    return ref as ((el: HTMLElement | null) => void) | RefObject<HTMLElement | null>
  }
  return null
}

export function mergeRefs(
  ...refs: Array<
    ((el: HTMLElement | null) => void) | RefObject<HTMLElement | null> | null | undefined
  >
): (el: HTMLElement | null) => void {
  return el => {
    for (const ref of refs) {
      if (!ref) continue
      if (typeof ref === 'function') {
        ref(el)
      } else {
        ;(ref as { current: HTMLElement | null }).current = el
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Anchor math (placement + trigger rect → anchor point in viewport coords)
// -----------------------------------------------------------------------------

interface Rect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

export function anchorOf(trigger: Rect, positioning: PositioningOptions): { x: number; y: number } {
  const { placement } = positioning
  const { main, cross } = positioning.offset
  const side = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right'
  const align = placement.split('-')[1] as 'start' | 'end' | undefined
  const sign = align === 'end' ? -1 : 1

  switch (side) {
    case 'top': {
      const x =
        align === 'start'
          ? trigger.left
          : align === 'end'
            ? trigger.right
            : trigger.left + trigger.width / 2
      return { x: x + cross * sign, y: trigger.top - main }
    }
    case 'bottom': {
      const x =
        align === 'start'
          ? trigger.left
          : align === 'end'
            ? trigger.right
            : trigger.left + trigger.width / 2
      return { x: x + cross * sign, y: trigger.bottom + main }
    }
    case 'left': {
      const y =
        align === 'start'
          ? trigger.top
          : align === 'end'
            ? trigger.bottom
            : trigger.top + trigger.height / 2
      return { x: trigger.left - main, y: y + cross * sign }
    }
    case 'right': {
      const y =
        align === 'start'
          ? trigger.top
          : align === 'end'
            ? trigger.bottom
            : trigger.top + trigger.height / 2
      return { x: trigger.right + main, y: y + cross * sign }
    }
  }
}
