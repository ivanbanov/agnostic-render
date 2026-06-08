/**
 * Dialog — public types.
 *
 * Under the "machine never sees props" rule: config the transitions need lives
 * in `DialogContext` (seeded from props at the edge); callbacks + controlled
 * `open` live on `DialogProps` and are handled by the connector, never the
 * machine.
 *
 * See SPEC.md for the contract this file implements.
 */

import type { AttrBindings, EventBindings } from '@render-experiment/machine-core'

// -----------------------------------------------------------------------------
// Caller-facing props
// -----------------------------------------------------------------------------

/**
 * Optional event payload for the cancelable close handlers. `preventDefault()`
 * keeps the dialog open.
 */
export interface DialogCancelableEvent {
  preventDefault: () => void
  defaultPrevented: boolean
}

export interface DialogProps {
  id: string
  /** Controlled open state. Pass `undefined` for uncontrolled. */
  open?: boolean
  defaultOpen?: boolean
  /**
   * When true (default), the rest of the page is inert while open: backdrop
   * blocks interaction, scroll is locked, focus is trapped, `aria-modal` is set.
   */
  modal?: boolean
  /** Esc dismisses the dialog. Default true. */
  closeOnEscape?: boolean
  /** Pointer down outside the content dismisses the dialog. Default true. */
  closeOnOutsidePointerDown?: boolean
  onOpenChange?: (details: { open: boolean }) => void
  /** Fires when Escape is pressed while open. preventDefault() keeps it open. */
  onEscapeKeyDown?: (event: DialogCancelableEvent) => void
  /** Fires on a pointer-down outside the content. preventDefault() keeps it open. */
  onPointerDownOutside?: (event: DialogCancelableEvent) => void
}

/**
 * Props after defaults are applied (`{ ...DIALOG_DEFAULTS, ...props }`),
 * resolved once at the adapter entry. The connector operates on this concrete
 * shape (controlled `open`, callbacks); the machine does NOT — config fields are
 * seeded into context.
 */
export interface DialogMachineProps {
  id: string
  open?: boolean
  defaultOpen: boolean
  modal: boolean
  closeOnEscape: boolean
  closeOnOutsidePointerDown: boolean
  onOpenChange?: DialogProps['onOpenChange']
  onEscapeKeyDown?: DialogProps['onEscapeKeyDown']
  onPointerDownOutside?: DialogProps['onPointerDownOutside']
}

// -----------------------------------------------------------------------------
// Machine context (config the transitions need + internal state)
// -----------------------------------------------------------------------------

/**
 * The machine's context. Config fields (id, modal) are seeded from the resolved
 * props at construction; the machine reads them as context, never as props.
 */
export interface DialogContext {
  id: string
  modal: boolean
}

export type DialogState = 'closed' | 'open'

/**
 * Derived presentation: the Radix `data-state` vocabulary, mapped 1:1 from the
 * control state. A SEMANTIC value — a DOM view surfaces it as `data-state`,
 * another target however it paints. Derived in `computed`, never stored.
 */
export type DialogPresentation = 'open' | 'closed'

export interface DialogComputed {
  presentation: DialogPresentation
  /** Stable element ids derived from `context.id` (so title/description/content
   * can cross-reference for aria-labelledby / aria-describedby). */
  contentId: string
  titleId: string
  descriptionId: string
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

export type DialogEvent =
  | { type: 'open'; src?: string }
  | { type: 'close'; src?: string }
  | { type: 'toggle'; src?: string }
  | { type: 'escape'; src?: string }
  | { type: 'outside.pointer.down'; src?: string }

// -----------------------------------------------------------------------------
// Connect API (consumed by adapter render layer)
// -----------------------------------------------------------------------------

/**
 * A named part — one flat bag of the things the view spreads onto the element:
 * event handlers (`onPress`, …) and substrate attributes (`id`, `role`,
 * `labelledBy`, `modal`, …). The adapter's normalize() maps each key by name.
 * Core emits no `data-*`; each adapter derives whatever it wants from these.
 */
export type DialogPart = EventBindings & AttrBindings

export interface DialogApi {
  open: boolean
  /** Derived presentation (computed.presentation) — DOM view surfaces as `data-state`. */
  presentation: DialogPresentation
  /** Resolved modal flag — the view reads it to decide scroll-lock / inert / trap. */
  modal: boolean
  setOpen: (next: boolean) => void
  parts: {
    trigger: DialogPart
    overlay: DialogPart
    content: DialogPart
    title: DialogPart
    description: DialogPart
    close: DialogPart
  }
}
