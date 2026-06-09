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
 * - **Text doesn't inherit color from a View**, so the Title/Description/Close
 *   text carries its color explicitly.
 */
import { Children, Fragment, useId, useRef, type ReactNode } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
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

// Painted text presentation (RN Text doesn't inherit a parent View's color).
const TITLE_TEXT = { color: '#0d0f16', fontSize: 18, fontWeight: '600' as const }
const DESCRIPTION_TEXT = { color: '#5b6172', fontSize: 14 }
const CLOSE_TEXT = { color: '#1c1e26', fontSize: 14, fontWeight: '600' as const }

/** Wrap stray string/number children in <Text>; leave elements alone. */
function renderText(children: ReactNode, style: object): ReactNode {
  return Children.map(children, (child, i) =>
    typeof child === 'string' || typeof child === 'number' ? (
      <Text key={`t-${i}`} style={style}>
        {child}
      </Text>
    ) : (
      <Fragment key={`f-${i}`}>{child}</Fragment>
    ),
  )
}

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

  // The backdrop must be a Pressable to catch the tap-outside (a styled View
  // won't fire onPress). We render it inline with the overlay look (dim +
  // center) rather than via Styled.Overlay so the tap target is real; Content
  // inside stops the touch from bubbling here.
  const merged = mergeProps(consumerProps as Record<string, unknown>, {
    onPress: onBackdropPress,
  })

  return (
    <Modal transparent visible animationType='fade' onRequestClose={() => api.setOpen(false)}>
      <Pressable style={styles.backdrop} onPress={onBackdropPress} accessible={false}>
        <View {...(merged as ViewProps)} style={styles.backdropInner} pointerEvents='box-none'>
          {children}
        </View>
      </Pressable>
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
// <Dialog.Title> / <Dialog.Description>
// =============================================================================

export interface DialogTitleProps extends Omit<ViewProps, 'children'> {
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
    <Styled.Title {...(merged as ViewProps)} open={api.open}>
      {renderText(children, TITLE_TEXT)}
    </Styled.Title>
  )
}

export interface DialogDescriptionProps extends Omit<ViewProps, 'children'> {
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
    <Styled.Description {...(merged as ViewProps)} open={api.open}>
      {renderText(children, DESCRIPTION_TEXT)}
    </Styled.Description>
  )
}

// =============================================================================
// <Dialog.Close> — closes on press
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
  return (
    <Styled.Close {...(merged as PressableProps)} open={api.open}>
      {renderText(children ?? 'Close', CLOSE_TEXT)}
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

const styles = StyleSheet.create({
  // The dim, centered backdrop that fills the Modal (window space).
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(13, 15, 22, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backdropInner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
