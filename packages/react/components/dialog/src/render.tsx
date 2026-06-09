import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { mergeProps, normalize } from '@render-experiment/machine-react'
import {
  DIALOG_DEFAULTS,
  resolveOutsidePointerDown,
  type DialogApi,
  type DialogMachineProps,
  type DialogProps,
} from '@render-experiment/dialog-core'
import { useDialogApi } from './generated/api'
import { DialogContextRef, useDialogContext } from './context'
import * as Styled from './generated/elements'
import { cloneOnly, focusInitial, focusableWithin, getChildRef, mergeRefs } from './utils'

// =============================================================================
// <Dialog> — root, owns the machine + the trigger / content refs
// =============================================================================

export interface DialogRootProps extends Omit<DialogProps, 'id'> {
  id?: string
  children: ReactNode
}

export function DialogRoot(props: DialogRootProps) {
  const { children, id: providedId, ...rest } = props
  const autoId = useId()
  const id = providedId ?? autoId

  const triggerRef = useRef<HTMLElement | null>(null)
  const contentRef = useRef<HTMLElement | null>(null)
  const rawProps: DialogProps = { ...rest, id }
  const api = useDialogApi(rawProps)
  const resolved: DialogMachineProps = { ...DIALOG_DEFAULTS, ...rawProps }

  return (
    <DialogContextRef.Provider value={{ api, props: resolved, triggerRef, contentRef }}>
      {children}
    </DialogContextRef.Provider>
  )
}

// =============================================================================
// <Dialog.Trigger> — clones the child, captures its element, opens on press
// =============================================================================

export interface DialogTriggerProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children: ReactNode
}

export function DialogTrigger(props: DialogTriggerProps) {
  const { children, ...consumerProps } = props
  const { api, triggerRef } = useDialogContext()

  const setRef = (node: HTMLElement | null) => {
    triggerRef.current = node
  }

  // The trigger's logical handler is `onPress` (a toggle) — normalize maps it to
  // onClick on the DOM.
  const machineProps = normalize(api.parts.trigger as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)

  return cloneOnly(children, {
    ...merged,
    'data-state': api.presentation,
    ref: mergeRefs(setRef, getChildRef(children)),
  })
}

// =============================================================================
// <Dialog.Portal> — renders overlay + content at the document root
// =============================================================================

export interface DialogPortalProps {
  children: ReactNode
  /** Where to portal. Defaults to document.body. */
  container?: Element | null
}

export function DialogPortal({ children, container }: DialogPortalProps) {
  const { api } = useDialogContext()
  if (!api.open) return null
  if (typeof document === 'undefined') return null
  return createPortal(children, container ?? document.body)
}

// =============================================================================
// <Dialog.Overlay> — the backdrop; pointer-down on it closes (with veto)
// =============================================================================

export interface DialogOverlayProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children?: ReactNode
}

export function DialogOverlay(props: DialogOverlayProps) {
  const { children, ...consumerProps } = props
  const { api, props: ctxProps, contentRef } = useDialogContext()

  const onPointerDown = (event: React.PointerEvent) => {
    // Only a pointer-down that started OUTSIDE the content counts as "outside".
    if (contentRef.current && contentRef.current.contains(event.target as Node)) return
    const { close } = resolveOutsidePointerDown({
      closeOnOutsidePointerDown: ctxProps.closeOnOutsidePointerDown,
      state: api.open ? 'open' : 'closed',
      onPointerDownOutside: ctxProps.onPointerDownOutside,
    })
    if (close) api.setOpen(false)
  }

  const machineProps = normalize(api.parts.overlay as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, {
    ...machineProps,
    onPointerDown,
    'data-state': api.presentation,
  })

  return (
    <Styled.Overlay {...merged} open={api.open}>
      {children}
    </Styled.Overlay>
  )
}

// =============================================================================
// <Dialog.Content> — the dialog window. Owns focus trap / initial focus /
// focus return / scroll lock while modal + open.
// =============================================================================

export interface DialogContentProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children: ReactNode
}

export function DialogContent(props: DialogContentProps) {
  const { children, ...consumerProps } = props
  const { api, props: ctxProps, triggerRef, contentRef } = useDialogContext()

  const localRef = useRef<HTMLDivElement | null>(null)
  const setRef = (node: HTMLDivElement | null) => {
    localRef.current = node
    contentRef.current = node
  }

  const open = api.open
  const modal = api.modal

  // Initial focus into the dialog + focus return to the trigger on close.
  useLayoutEffect(() => {
    if (!open) return
    // The element focused when the dialog opened — the invoking element (the
    // trigger). Captured here so the cleanup returns focus to it without reading
    // a ref whose `.current` may have changed by cleanup time.
    const invoker = (document.activeElement as HTMLElement | null) ?? triggerRef.current
    const node = localRef.current
    if (node) focusInitial(node)
    return () => {
      // Return focus to the invoking element (WAI-ARIA), if still in the DOM.
      if (invoker && document.contains(invoker)) invoker.focus()
    }
  }, [open, triggerRef])

  // Focus trap: Tab/Shift+Tab cycle within the content while modal + open.
  useEffect(() => {
    if (!open || !modal) return
    const node = localRef.current
    if (!node) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusables = focusableWithin(node)
      if (focusables.length === 0) {
        // Nothing focusable inside — keep focus on the content itself.
        event.preventDefault()
        node.focus()
        return
      }
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      const active = document.activeElement as HTMLElement | null
      // If focus somehow sits outside the focusable list (e.g. on the content
      // surface itself), pull it to an end so Tab stays inside the dialog.
      const inside = active ? focusables.includes(active) : false
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }
    node.addEventListener('keydown', onKeyDown)
    return () => node.removeEventListener('keydown', onKeyDown)
  }, [open, modal])

  // Scroll lock while modal + open.
  useEffect(() => {
    if (!open || !modal) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open, modal])

  const machineProps = normalize(api.parts.content as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, {
    ...machineProps,
    'data-state': api.presentation,
  })
  void ctxProps

  return (
    <Styled.Content {...merged} open={open} ref={setRef}>
      {children}
    </Styled.Content>
  )
}

// =============================================================================
// <Dialog.Title> / <Dialog.Description> — labelled-by / described-by targets
// =============================================================================

export interface DialogTitleProps extends Omit<ComponentPropsWithoutRef<'h2'>, 'children'> {
  children: ReactNode
}

export function DialogTitle(props: DialogTitleProps) {
  const { children, ...consumerProps } = props
  const { api } = useDialogContext()
  const machineProps = normalize(api.parts.title as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)
  return <Styled.Title {...merged}>{children}</Styled.Title>
}

export interface DialogDescriptionProps extends Omit<ComponentPropsWithoutRef<'p'>, 'children'> {
  children: ReactNode
}

export function DialogDescription(props: DialogDescriptionProps) {
  const { children, ...consumerProps } = props
  const { api } = useDialogContext()
  const machineProps = normalize(api.parts.description as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)
  return <Styled.Description {...merged}>{children}</Styled.Description>
}

// =============================================================================
// <Dialog.Close> — closes on press
// =============================================================================

export interface DialogCloseProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children?: ReactNode
}

export function DialogClose(props: DialogCloseProps) {
  const { children, ...consumerProps } = props
  const { api } = useDialogContext()
  const machineProps = normalize(api.parts.close as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)
  return (
    <Styled.Close type='button' {...merged}>
      {children ?? 'Close'}
    </Styled.Close>
  )
}

// =============================================================================
// Composite
// =============================================================================

export const Dialog = Object.assign(DialogRoot, {
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Overlay: DialogOverlay,
  Content: DialogContent,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
})

export type { DialogApi }
