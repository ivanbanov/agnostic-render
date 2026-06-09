/**
 * RN Dialog view.
 *
 * Differences from the web dialog worth flagging:
 *
 * - **Window-space via Modal.** The Overlay renders inside an RN `<Modal>` so it
 *   lives in window space — RN's `position: absolute` is relative to the nearest
 *   positioned ancestor, not the window, so an inline overlay would be offset.
 *   The Modal also gives the hardware back / dim behavior.
 * - **Tap-outside to close.** The Overlay is the backdrop: tapping it (outside
 *   the Content) closes the dialog through the agnostic `resolveOutsidePointerDown`
 *   veto. The Content stops the touch from bubbling to the backdrop.
 * - **No focus trap / initial focus / focus return.** RN has no DOM focus model;
 *   those props are inert here (handled on web only).
 * - **No scroll lock.** The Content's own maxHeight scrolls tall content; the
 *   page behind a Modal is already non-interactive.
 * - **Android back button** maps to escape/close — see effects.ts.
 * - **Title / Description are `Text` elements** (codegen maps text parts → RN
 *   Text), so the shared title/description styles carry their own color/font and
 *   the text just renders — no per-view constants, no string wrapping.
 */
import { useId, useRef, type ReactNode } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type TextProps,
  type ViewProps,
} from 'react-native'
import { mergeProps, normalize } from '@render-experiment/machine-native'
import {
  DIALOG_DEFAULTS,
  resolveOutsidePointerDown,
  type DialogMachineProps,
  type DialogProps,
} from '@render-experiment/dialog-core'
import { useDialogApi } from './generated/api'
import * as Styled from './generated/elements'
import { DialogContextRef, useDialogContext } from './context'

// =============================================================================
// <Dialog> — root, owns the machine + trigger ref
// =============================================================================

export interface DialogRootProps extends Omit<DialogProps, 'id'> {
  id?: string
  children: ReactNode
}

export function DialogRoot(props: DialogRootProps) {
  const { children, id: providedId, ...rest } = props
  const autoId = useId()
  const id = providedId ?? autoId

  const triggerRef = useRef<View | null>(null)
  const rawProps: DialogProps = { ...rest, id }
  const api = useDialogApi(rawProps)
  const resolved: DialogMachineProps = { ...DIALOG_DEFAULTS, ...rawProps }

  return (
    <DialogContextRef.Provider value={{ api, props: resolved, triggerRef }}>
      {children}
    </DialogContextRef.Provider>
  )
}

// =============================================================================
// <Dialog.Trigger> — wraps the child in a Pressable that toggles the dialog
// =============================================================================

export interface DialogTriggerProps extends Omit<PressableProps, 'children'> {
  children: ReactNode
}

export function DialogTrigger(props: DialogTriggerProps) {
  const { children, ...consumerProps } = props
  const { api, triggerRef } = useDialogContext()

  // The trigger's logical handler is `onPress` (a toggle) — normalize keeps the
  // name on RN (Pressable.onPress).
  const normalized = normalize(api.parts.trigger as unknown as Record<string, unknown>)
  const merged = mergeProps(
    consumerProps as Record<string, unknown>,
    normalized as Record<string, unknown>,
  )

  return (
    <Pressable ref={triggerRef as unknown as React.Ref<View>} {...(merged as PressableProps)}>
      {children}
    </Pressable>
  )
}

// =============================================================================
// <Dialog.Portal> — RN has no DOM portal; the Overlay's Modal already lifts to
// window space, so Portal is a passthrough kept for API parity with the web.
// =============================================================================

export function DialogPortal({ children }: { children: ReactNode; container?: unknown }) {
  return <>{children}</>
}

// =============================================================================
// <Dialog.Overlay> — the Modal-hosted backdrop; tapping it (outside Content)
// closes via the agnostic outside-pointer-down veto.
// =============================================================================

export interface DialogOverlayProps extends Omit<ViewProps, 'children'> {
  children?: ReactNode
}

export function DialogOverlay(props: DialogOverlayProps) {
  const { children, ...consumerProps } = props
  const { api, props: ctxProps } = useDialogContext()

  if (!api.open) return null

  const onBackdropPress = () => {
    const { close } = resolveOutsidePointerDown({
      closeOnOutsidePointerDown: ctxProps.closeOnOutsidePointerDown,
      state: api.open ? 'open' : 'closed',
      onPointerDownOutside: ctxProps.onPointerDownOutside,
    })
    if (close) api.setOpen(false)
  }

  const merged = mergeProps(consumerProps as Record<string, unknown>, {})

  // Styled.Overlay carries the shared dim + centering paint. A styled View can't
  // fire onPress, so a transparent absolute-fill Pressable sits BEHIND the
  // content to catch the tap-outside (no visual style of its own → nothing
  // duplicated from the shared overlay). Content stops its own touches from
  // reaching it.
  return (
    <Modal transparent visible animationType='fade' onRequestClose={() => api.setOpen(false)}>
      <Styled.Overlay {...(merged as ViewProps)} open={api.open}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onBackdropPress} accessible={false} />
        {children}
      </Styled.Overlay>
    </Modal>
  )
}

// =============================================================================
// <Dialog.Content> — the dialog window. Stops touches from reaching the backdrop.
// =============================================================================

export interface DialogContentProps extends Omit<ViewProps, 'children'> {
  children: ReactNode
}

export function DialogContent(props: DialogContentProps) {
  const { children, ...consumerProps } = props
  const { api } = useDialogContext()

  const normalized = normalize(api.parts.content as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, {
    ...(normalized as Record<string, unknown>),
    // Swallow the touch so it doesn't bubble to the backdrop and close.
    onStartShouldSetResponder: () => true,
  })

  return (
    <Styled.Content {...(merged as ViewProps)} open={api.open}>
      {children}
    </Styled.Content>
  )
}

// =============================================================================
// <Dialog.Title> / <Dialog.Description> — styled RN Text; the shared style
// carries the color/font, so children render directly.
// =============================================================================

export interface DialogTitleProps extends Omit<TextProps, 'children'> {
  children: ReactNode
}

export function DialogTitle(props: DialogTitleProps) {
  const { children, ...consumerProps } = props
  const { api } = useDialogContext()
  const normalized = normalize(api.parts.title as unknown as Record<string, unknown>)
  const merged = mergeProps(
    consumerProps as Record<string, unknown>,
    normalized as Record<string, unknown>,
  )
  return (
    <Styled.Title {...(merged as TextProps)} open={api.open}>
      {children}
    </Styled.Title>
  )
}

export interface DialogDescriptionProps extends Omit<TextProps, 'children'> {
  children: ReactNode
}

export function DialogDescription(props: DialogDescriptionProps) {
  const { children, ...consumerProps } = props
  const { api } = useDialogContext()
  const normalized = normalize(api.parts.description as unknown as Record<string, unknown>)
  const merged = mergeProps(
    consumerProps as Record<string, unknown>,
    normalized as Record<string, unknown>,
  )
  return (
    <Styled.Description {...(merged as TextProps)} open={api.open}>
      {children}
    </Styled.Description>
  )
}

// =============================================================================
// <Dialog.Close> — closes on press. The label is the consumer's child (an
// element, e.g. a Button); a bare string is wrapped in a <Text> so RN can paint
// it (Text can't be a raw child of a Pressable).
// =============================================================================

export interface DialogCloseProps extends Omit<PressableProps, 'children'> {
  children?: ReactNode
}

export function DialogClose(props: DialogCloseProps) {
  const { children, ...consumerProps } = props
  const { api } = useDialogContext()
  const normalized = normalize(api.parts.close as unknown as Record<string, unknown>)
  const merged = mergeProps(
    consumerProps as Record<string, unknown>,
    normalized as Record<string, unknown>,
  )
  const label = children ?? 'Close'
  return (
    <Styled.Close {...(merged as PressableProps)} open={api.open}>
      {typeof label === 'string' ? <Text>{label}</Text> : label}
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
