import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react'

// -----------------------------------------------------------------------------
// Children / ref helpers (same shape as the tooltip's)
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
      if (typeof ref === 'function') ref(el)
      else (ref as { current: HTMLElement | null }).current = el
    }
  }
}

// -----------------------------------------------------------------------------
// Focus helpers — the modal focus trap + initial focus
// -----------------------------------------------------------------------------

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Tabbable elements inside `root`, in DOM order, skipping hidden ones. */
export function focusableWithin(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return nodes.filter(
    el => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0,
  )
}

/**
 * Move focus into the dialog on open: the first focusable element inside, or the
 * content surface itself (it carries `tabindex=-1`) when there's nothing to
 * focus. WAI-ARIA modal-dialog initial-focus behavior.
 */
export function focusInitial(content: HTMLElement): void {
  const focusables = focusableWithin(content)
  const target = focusables[0] ?? content
  target.focus()
}
