/**
 * RN Tooltip view.
 *
 * Differences from the web tooltip worth flagging:
 *
 * - **Long-press, not hover.** RN has no hover model. The trigger opens
 *   on long-press (~500ms by default; configurable via TooltipProps).
 *   This also means "skip-delay window" doesn't apply the same way on
 *   touch — it stays in the machine but never fires.
 *
 * - **Inline absolute overlay.** Content renders inline with
 *   `position: absolute` in window-space. Works fine for most layouts;
 *   deeply clipped contexts (ScrollView, FlatList) would need a Modal
 *   or portal — TooltipProvider exists for that but the v1 view
 *   doesn't use it yet.
 *
 * - **Anchor via measureInWindow.** RN's measure callback is async, so
 *   we compute the anchor once when the tooltip opens and re-measure
 *   on next layout. Window resize would require a Dimensions listener
 *   (omitted for the v1 — covers 90% of real use).
 *
 * - **No escape-key listener.** Closing happens on outside tap or
 *   pressOut. The Android back button could be wired up — see
 *   the BackHandler note in trackEscapeKey below.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  BackHandler,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type ViewProps,
} from 'react-native'
import { mergeProps, normalize } from '@render-experiment/machine-native'
import {
  tooltipProps as resolveProps,
  type ResolvedTooltipProps,
  type TooltipApi,
  type TooltipProps,
} from '@render-experiment/tooltip-core'
import { useTooltipApi } from './generated/api'
import { resolveContent, resolvePositioner } from './generated/elements'
import { useTooltipProviderConfig } from './context'

// -----------------------------------------------------------------------------
// Internal context — Trigger and Content read api + triggerRef + anchor
// -----------------------------------------------------------------------------

interface TooltipCtxValue {
  api: TooltipApi
  props: ResolvedTooltipProps
  triggerRef: React.MutableRefObject<View | null>
  anchor: { x: number; y: number; width: number; height: number } | null
  setAnchor: (a: { x: number; y: number; width: number; height: number } | null) => void
  id: string
}

const TooltipCtx = createContext<TooltipCtxValue | null>(null)

function useTooltipCtxOrThrow() {
  const ctx = useContext(TooltipCtx)
  if (!ctx) {
    throw new Error('Tooltip.Trigger / Tooltip.Content must be inside <Tooltip>')
  }
  return ctx
}

// -----------------------------------------------------------------------------
// <Tooltip> — root provider
// -----------------------------------------------------------------------------

export interface TooltipRootProps extends Omit<TooltipProps, 'id'> {
  id?: string
  children: ReactNode
}

export function TooltipRoot(props: TooltipRootProps) {
  const { children, id: providedId, ...rest } = props
  const autoId = useId()
  const id = providedId ?? autoId

  // Provider config supplies inheritable defaults. Root props override.
  const providerConfig = useTooltipProviderConfig()
  const triggerRef = useRef<View | null>(null)
  const [anchor, setAnchor] = useState<TooltipCtxValue['anchor']>(null)
  const rawProps: TooltipProps = { ...providerConfig, ...rest, id }
  const api = useTooltipApi(rawProps)
  const resolved = resolveProps(rawProps)

  return (
    <TooltipCtx.Provider value={{ api, props: resolved, triggerRef, anchor, setAnchor, id }}>
      {children}
    </TooltipCtx.Provider>
  )
}

// -----------------------------------------------------------------------------
// <Tooltip.Trigger> — wraps the user's child in a Pressable with long-press
// -----------------------------------------------------------------------------

export interface TooltipTriggerProps extends Omit<PressableProps, 'children'> {
  children: ReactNode
  /** Long-press duration in ms. Defaults to 500. */
  delayLongPress?: number
}

export function TooltipTrigger(props: TooltipTriggerProps) {
  const { children, delayLongPress, ...consumerProps } = props
  const { api, props: ctxProps, triggerRef, setAnchor } = useTooltipCtxOrThrow()

  // Map openDelay (resolved against Provider config + Root prop) to RN's
  // delayLongPress. Explicit Trigger prop wins if the consumer set one.
  const effectiveDelay = delayLongPress ?? ctxProps.openDelay ?? 500

  // Measure on layout so the anchor is current when the tooltip opens.
  const measure = useCallback(() => {
    const node = triggerRef.current
    if (!node) return
    node.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
    })
  }, [setAnchor, triggerRef])

  const onLayout = useCallback(
    (_: LayoutChangeEvent) => {
      measure()
    },
    [measure],
  )

  // Machine-supplied bindings (handler functions). The native normalizer
  // drops hover-only handlers; we supplement with onLongPress/onPressOut
  // below to actually open/close.
  const normalized = normalize(api.parts.trigger.handlers as unknown as Record<string, unknown>)

  const machineProps: Record<string, unknown> = {
    ...(normalized as object),
    onLayout,
    onLongPress: () => {
      measure()
      api.setOpen(true)
    },
    onPressOut: () => {
      // Close on release. Removes the need for a tap-outside listener;
      // keep-open-while-held is the standard touch idiom.
      api.setOpen(false)
    },
    delayLongPress: effectiveDelay,
  }

  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)

  return (
    <Pressable ref={triggerRef as unknown as React.Ref<View>} {...(merged as PressableProps)}>
      {children}
    </Pressable>
  )
}

// -----------------------------------------------------------------------------
// <Tooltip.Content> — renders into the portal slot or inline
// -----------------------------------------------------------------------------

export interface TooltipContentProps extends Omit<ViewProps, 'children'> {
  children: ReactNode
}

export function TooltipContent(props: TooltipContentProps) {
  const { children, ...consumerProps } = props
  const { api, props: ctxProps, anchor } = useTooltipCtxOrThrow()

  const rendered = api.parts.content.rendered
  const { side } = api.parts.content.variants

  // Wire Android back button to close (mirror of trackEscapeKey on web).
  useEffect(() => {
    if (!rendered) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      api.setOpen(false)
      return true
    })
    return () => sub.remove()
  }, [rendered, api])

  if (!rendered) return null

  const positionerStyle = resolvePositioner({ anchored: !!anchor })
  const contentStyle = resolveContent({ side })

  // Convert anchor center → absolute coords for the positioner.
  const positionedStyle = anchor
    ? {
        ...positionerStyle,
        left: anchor.x + anchor.width / 2,
        top: anchor.y + anchor.height,
      }
    : positionerStyle

  // Inline rendering. The tooltip is absolutely positioned in window-space.
  // Consumer props land on the inner content View (the painted box);
  // the positioner is structural and consumer-opaque.
  const machineProps: Record<string, unknown> = {
    style: [contentStyle, anchorContentTransform(side)],
    pointerEvents: 'auto',
  }
  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)

  return (
    <View style={positionedStyle} pointerEvents='box-none'>
      <View {...(merged as ViewProps)}>
        {typeof children === 'string' ? (
          <Text
            style={{
              color: (contentStyle.color as string) ?? '#fff',
              fontSize: contentStyle.fontSize as number,
            }}
          >
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  )
}

// Equivalent of RN's edge-pinning trick: shift the content so the pinned
// edge sits on the anchor point.
function anchorContentTransform(side: 'top' | 'bottom' | 'left' | 'right'): {
  transform?: Array<{ translateX?: number; translateY?: number }>
} {
  switch (side) {
    case 'top':
      return { transform: [{ translateY: -8 }, { translateX: -50 }] }
    case 'bottom':
      return { transform: [{ translateY: 8 }, { translateX: -50 }] }
    case 'left':
      return { transform: [{ translateX: -8 }, { translateY: -50 }] }
    case 'right':
      return { transform: [{ translateX: 8 }, { translateY: -50 }] }
  }
}

// -----------------------------------------------------------------------------
// Composite
// -----------------------------------------------------------------------------

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
})
