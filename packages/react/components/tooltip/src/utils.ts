import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'
import type { Placement } from '@render-experiment/tooltip-core'

// -----------------------------------------------------------------------------
// Children / ref helpers
// -----------------------------------------------------------------------------

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
// Anchor math: trigger rect + placement → anchor point in viewport coords.
// -----------------------------------------------------------------------------

interface Rect {
  top: number
  left: number
  right: number
  bottom: number
  width: number
  height: number
}

/**
 * Anchor point for the content, in viewport coords. `offsetX`/`offsetY`
 * are SCREEN axes (they don't rotate with the side) and are added to the
 * computed anchor after side/alignment positioning.
 */
export function anchorOf(
  trigger: Rect,
  placement: Placement,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } {
  const side = placement.split('-')[0] as 'top' | 'bottom' | 'left' | 'right'
  const align = placement.split('-')[1] as 'start' | 'end' | undefined

  let x: number
  let y: number
  switch (side) {
    case 'top':
    case 'bottom': {
      x =
        align === 'start'
          ? trigger.left
          : align === 'end'
            ? trigger.right
            : trigger.left + trigger.width / 2
      y = side === 'top' ? trigger.top : trigger.bottom
      break
    }
    case 'left':
    case 'right': {
      y =
        align === 'start'
          ? trigger.top
          : align === 'end'
            ? trigger.bottom
            : trigger.top + trigger.height / 2
      x = side === 'left' ? trigger.left : trigger.right
      break
    }
  }
  return { x: x + offsetX, y: y + offsetY }
}

/** Main-axis (anchor-perpendicular) offset for collision math, from screen X/Y. */
export function mainOffsetFor(placement: Placement, offsetX: number, offsetY: number): number {
  const side = placement.split('-')[0]
  return side === 'left' || side === 'right' ? Math.abs(offsetX) : Math.abs(offsetY)
}
