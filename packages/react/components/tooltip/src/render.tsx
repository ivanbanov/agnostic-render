import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { pickSide, type Side } from '@render-experiment/utils'
import { mergeProps, normalize } from '@render-experiment/machine-react'
import {
  TOOLTIP_DEFAULTS,
  type TooltipApi,
  type TooltipMachineProps,
  type TooltipProps,
} from '@render-experiment/tooltip-core'
import { useTooltipApi } from './generated/api'
import { TooltipContextRef, useTooltipContext } from './context'
import { useTooltipProviderConfig } from './provider'
import * as Styled from './generated/elements'
import { anchorOf, cloneOnly, getChildRef, mainOffsetFor, mergeRefs } from './utils'

// -----------------------------------------------------------------------------
// <Tooltip> — provider, owns the machine
// -----------------------------------------------------------------------------

export interface TooltipRootProps extends Omit<TooltipProps, 'id'> {
  id?: string
  children: ReactNode
}

export function TooltipRoot(props: TooltipRootProps) {
  const { children, id: providedId, ...rest } = props
  const autoId = useId()
  const id = providedId ?? autoId

  // Provider supplies inheritable defaults; Root props override them.
  const providerConfig = useTooltipProviderConfig()
  const rawProps: TooltipProps = { ...providerConfig, ...rest, id }

  const triggerRef = useRef<HTMLElement | null>(null)
  const api = useTooltipApi(rawProps)
  // Resolve the same way the api hook does, for the context's config view.
  const resolved: TooltipMachineProps = { ...TOOLTIP_DEFAULTS, ...rawProps }

  return (
    <TooltipContextRef.Provider value={{ api, props: resolved, triggerRef }}>
      {children}
    </TooltipContextRef.Provider>
  )
}

// -----------------------------------------------------------------------------
// <Tooltip.Trigger> — clones child, captures its element via callback ref
// -----------------------------------------------------------------------------
//
// Consumer-passed props on <Tooltip.Trigger> (data-*, aria-*, className,
// onClick, etc.) are merged onto the cloned child. Machine-supplied
// handlers and attrs (onPointerMove, aria-describedby, ...) take
// precedence when both sides set the same key; for event handlers,
// both fire via mergeProps.

export interface TooltipTriggerProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  children: ReactNode
}

export function TooltipTrigger(props: TooltipTriggerProps) {
  const { children, ...consumerProps } = props
  const { api, triggerRef } = useTooltipContext()

  const setRef = (node: HTMLElement | null) => {
    triggerRef.current = node
  }

  const machineProps = {
    ...normalize(api.parts.trigger.handlers as unknown as Record<string, unknown>),
    ...normalize(api.parts.trigger.attrs as unknown as Record<string, unknown>),
  }

  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)

  const triggerProps = {
    ...merged,
    ref: mergeRefs(setRef, getChildRef(children)),
  }
  return cloneOnly(children, triggerProps)
}

// -----------------------------------------------------------------------------
// <Tooltip.Content>
// -----------------------------------------------------------------------------
//
// Render structure:
//   <Styled.Positioner>  position: fixed at anchor point (zero-size,
//                         from spec); top/left are runtime data and
//                         come through the `css` prop.
//     <Styled.Content>   position: absolute + edge-pinned via variant
//   </Styled.Positioner>
//
// Consumer-passed props (className, style, data-testid, onMouseEnter,
// etc.) are merged onto <Styled.Content>. Variants come through as
// named props (`side`, `red`); they aren't spread from `props`.

export interface TooltipContentProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children: ReactNode
}

export function TooltipContent(props: TooltipContentProps) {
  const { children, ...consumerProps } = props
  const { api, props: ctxProps, triggerRef } = useTooltipContext()
  if (!api.parts.content.rendered) return null
  return (
    <PositionedContent
      api={api}
      ctxProps={ctxProps}
      consumerProps={consumerProps}
      triggerRef={triggerRef}
    >
      {children}
    </PositionedContent>
  )
}

function PositionedContent({
  api,
  ctxProps,
  consumerProps,
  triggerRef,
  children,
}: {
  api: TooltipApi
  ctxProps: TooltipMachineProps
  consumerProps: Record<string, unknown>
  triggerRef: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  void ctxProps

  const contentRef = useRef<HTMLDivElement | null>(null)
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [effectiveSide, setEffectiveSide] = useState<Side>(api.parts.content.variants.side)

  // Measure: read both rects, compute the effective side (collision
  // flip), then anchor against the effective placement so the offsets
  // come out right.
  useLayoutEffect(() => {
    const measure = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const triggerRect = trigger.getBoundingClientRect()
      const contentRect = contentRef.current?.getBoundingClientRect() ?? null

      const preferred = api.parts.content.variants.side
      const { placement, offsetX, offsetY } = api.parts.content
      const next = pickSide(
        preferred,
        triggerRect,
        contentRect,
        { width: window.innerWidth, height: window.innerHeight },
        mainOffsetFor(placement, offsetX, offsetY),
      )
      setEffectiveSide(next)

      // Re-anchor against the (possibly flipped) side.
      const flippedPlacement = next === preferred ? placement : (next as typeof placement)
      setAnchor(anchorOf(triggerRect, flippedPlacement, offsetX, offsetY))
    }

    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [
    api.parts.content.placement,
    api.parts.content.offsetX,
    api.parts.content.offsetY,
    api.parts.content.variants.side,
    triggerRef,
  ])

  // Trigger-move detection: a ResizeObserver on the trigger catches the
  // case where the trigger's box changes without a window scroll/resize.
  // No-op when ResizeObserver isn't available (older RN-web shells).
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const trigger = triggerRef.current
    if (!trigger) return
    const ro = new ResizeObserver(() => {
      // Re-run measurement on the next frame.
      const t = triggerRef.current
      if (!t) return
      const triggerRect = t.getBoundingClientRect()
      const contentRect = contentRef.current?.getBoundingClientRect() ?? null
      const preferred = api.parts.content.variants.side
      const { placement, offsetX, offsetY } = api.parts.content
      const next = pickSide(
        preferred,
        triggerRect,
        contentRect,
        { width: window.innerWidth, height: window.innerHeight },
        mainOffsetFor(placement, offsetX, offsetY),
      )
      setEffectiveSide(next)
      const flippedPlacement = next === preferred ? placement : (next as typeof placement)
      setAnchor(anchorOf(triggerRect, flippedPlacement, offsetX, offsetY))
    })
    ro.observe(trigger)
    return () => ro.disconnect()
  }, [
    api.parts.content.placement,
    api.parts.content.offsetX,
    api.parts.content.offsetY,
    api.parts.content.variants.side,
    triggerRef,
  ])

  // Viewport dismiss: close when the trigger scrolls out of view.
  // Implemented via IntersectionObserver so we don't need to poll.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const trigger = triggerRef.current
    if (!trigger) return
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          api.setOpen(false)
        }
      }
    })
    io.observe(trigger)
    return () => io.disconnect()
  }, [api, triggerRef])

  const handlerProps = normalize(api.parts.content.handlers as unknown as Record<string, unknown>)
  const attrProps = normalize(api.parts.content.attrs as unknown as Record<string, unknown>)

  // Two runtime numbers — that's the irreducible minimum.
  const anchorCoords = anchor ? { top: anchor.y, left: anchor.x } : undefined

  // Override the connect's `side` (preferred) with the effective side
  // (after collision flip) so styling and the data-side attr reflect
  // where the tooltip actually ended up.
  const merged = mergeProps(consumerProps, {
    ...handlerProps,
    ...attrProps,
    'data-side': effectiveSide,
  })

  return (
    <Styled.Positioner anchored={!!anchor} css={anchorCoords}>
      <Styled.Content {...merged} side={effectiveSide} ref={contentRef}>
        {children}
      </Styled.Content>
    </Styled.Positioner>
  )
}

// -----------------------------------------------------------------------------
// Public composite
// -----------------------------------------------------------------------------

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
})
