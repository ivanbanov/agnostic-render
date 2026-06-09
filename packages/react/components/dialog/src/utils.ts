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

/**
 * Tabbable elements inside `root`, in DOM order, skipping hidden ones.
 *
 * Visibility is decided structurally (`hidden` attribute / ancestor, or
 * `display:none` / `visibility:hidden`) rather than by measured layout —
 * `offsetWidth`/`getClientRects` are always 0 in jsdom (no layout engine), which
 * would drop every element under test. The structural check matches in both a
 * real browser and jsdom.
 */
export function focusableWithin(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
  return nodes.filter(el => !isHidden(el))
}

function isHidden(el: HTMLElement): boolean {
  if (el.hidden || el.closest('[hidden]')) return true
  // getComputedStyle exists in jsdom and returns the inline/sheet styles.
  const win = el.ownerDocument.defaultView
  if (win) {
    const style = win.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return true
  }
  return false
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
