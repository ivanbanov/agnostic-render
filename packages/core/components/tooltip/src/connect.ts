/**
 * Tooltip connect — a pure mapping from the machine snapshot (+ props) to the
 * logical surface the view spreads.
 *
 * Output is substrate-agnostic:
 *   - handlers — `onPointerMove`, `onFocus`, …
 *   - attrs    — substrate attributes: `id`, `describedBy`, `role`, `disabled`
 * Plus content-only fields (`side`, `placement`, offsets, `rendered`) the view
 * consumes to position/mount. Core never emits `data-*` — each adapter derives
 * whatever `data-*` it wants from the machine state + these fields.
 *
 * This is pure — it runs on every snapshot read and must not fire side effects.
 * Consumer callbacks (onOpenChange) are fired by the adapter, which observes the
 * machine's `open` via select (the machine never fires them, never reads props).
 *
 * See ../SPEC.md for the contract.
 */

import type { Connect } from '@render-experiment/machine-core'
import { makeReaction } from '@render-experiment/machine-core'
import { placementToSide } from '@render-experiment/utils'
import type {
  TooltipApi,
  TooltipContext,
  TooltipEvent,
  TooltipMachineProps,
  TooltipState,
} from './types'

export const connectTooltip: Connect<
  TooltipState,
  TooltipContext,
  TooltipEvent,
  TooltipMachineProps,
  TooltipApi
> = ({ state, context, props, send }) => {
  const open = state === 'open' || state === 'closing'
  const triggerId = `tooltip:${context.id}:trigger`
  const contentId = `tooltip:${context.id}:content`
  const side = placementToSide(context.placement)

  return {
    open,
    setOpen(next) {
      if (open === next) return
      send({ type: next ? 'open' : 'close' })
    },
    parts: {
      // One flat bag per part: handlers + attrs the view spreads. (Content also
      // carries positioning fields the view consumes — see below.)
      trigger: {
        onPointerMove: event => {
          if (event?.defaultPrevented) return
          if (props.disabled) return
          if (event?.pointerType === 'touch') return
          send({ type: 'pointer.move' })
        },
        onPointerLeave: () => {
          if (props.disabled) return
          send({ type: 'pointer.leave' })
        },
        onFocus: () => {
          if (props.disabled) return
          send({ type: 'open', src: 'trigger.focus' })
        },
        onBlur: () => {
          if (props.disabled) return
          send({ type: 'close', src: 'trigger.blur' })
        },
        id: triggerId,
        describedBy: open ? contentId : undefined,
        disabled: props.disabled,
      },
      content: {
        onPointerEnter: () => {
          if (props.disableHoverableContent) return
          send({ type: 'content.pointer.move' })
        },
        onPointerLeave: () => {
          if (props.disableHoverableContent) return
          send({ type: 'content.pointer.leave' })
        },
        id: contentId,
        role: 'tooltip',
        // Positioning — consumed by the view (not spread as attrs).
        side,
        placement: context.placement,
        offsetX: props.offsetX,
        offsetY: props.offsetY,
      },
    },
  }
}

/**
 * Substrate-agnostic reactions: machine-state change → consumer callback,
 * declared once and fired identically on every target. (Escape is NOT here —
 * it's a DOM listener, so it lives in each target's effects.)
 */
const reaction = makeReaction<TooltipState, TooltipContext, TooltipEvent, TooltipMachineProps>()

/** Fire onOpenChange whenever the tooltip becomes visible (open or closing) or hides. */
const onOpenChange = reaction(
  m => m.matches('open') || m.matches('closing'), // Value = boolean (inferred from selector)
  (open, props) => props.onOpenChange?.({ open }), // open: boolean
)

connectTooltip.reactions = [onOpenChange]
