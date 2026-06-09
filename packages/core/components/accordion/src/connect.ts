import type { Connect, ConnectSnapshot } from '@render-experiment/machine-core'
import { makeReaction } from '@render-experiment/machine-core'
import type {
  AccordionApi,
  AccordionComputed,
  AccordionContext,
  AccordionEvent,
  AccordionItemPart,
  AccordionItemProps,
  AccordionMachineProps,
  AccordionNavTarget,
  AccordionState,
} from './types'
import { step } from './utils'

type Snapshot = ConnectSnapshot<
  AccordionState,
  AccordionContext,
  AccordionEvent,
  AccordionMachineProps,
  AccordionComputed
>

const triggerIdFor = (instanceId: string, value: string) =>
  `accordion:${instanceId}:trigger:${value}`
const contentIdFor = (instanceId: string, value: string) =>
  `accordion:${instanceId}:content:${value}`

/** Build the api for a given snapshot + the items the view is about to render. */
function buildApi(snapshot: Snapshot, items: AccordionItemProps[]): AccordionApi {
  // The accordion api reads only context/send — controlled `value` + the
  // onValueChange callback are handled by the connector reaction, not here.
  const { context, send } = snapshot
  const open = context.value
  const accordionDisabled = context.disabled

  const triggerId = (value: string) => triggerIdFor(context.id, value)

  const navigate = (from: string, target: AccordionNavTarget): string | null => {
    let next: AccordionItemProps | undefined
    switch (target) {
      case 'next':
        next = step(items, from, 1, context.loop)
        break
      case 'prev':
        next = step(items, from, -1, context.loop)
        break
      case 'first':
        next = step(items, null, 1, context.loop)
        break
      case 'last':
        next = step(items, null, -1, context.loop)
        break
    }
    return next ? next.value : null
  }

  // Map a keydown to a nav intent based on orientation (Radix-parity).
  const navTargetForKey = (key: string | undefined): AccordionNavTarget | null => {
    if (!key) return null
    const vertical = context.orientation === 'vertical'
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight'
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft'
    if (key === nextKey) return 'next'
    if (key === prevKey) return 'prev'
    if (key === 'Home') return 'first'
    if (key === 'End') return 'last'
    return null
  }

  const setValue = (next: string[]) => {
    send({ type: 'value.set', value: next })
  }

  const getItem = (item: AccordionItemProps): AccordionItemPart => {
    const itemDisabled = accordionDisabled || !!item.disabled
    const isOpen = open.includes(item.value)
    const tId = triggerId(item.value)
    const cId = contentIdFor(context.id, item.value)

    return {
      item: {
        open: isOpen,
        disabled: itemDisabled,
        // No role/handlers — the item wrapper is a passive grouping element. The
        // view derives data-state from `open`/`disabled`.
      },
      header: {
        // The header is a heading element wrapping the trigger (APG pattern);
        // the heading role is implied by the tag in the view.
        role: 'heading',
      },
      trigger: {
        open: isOpen,
        disabled: itemDisabled,
        onPress: () => {
          if (itemDisabled) return
          send({ type: 'item.toggle', value: item.value })
        },
        onKeyDown: event => {
          if (!event) return
          const intent = navTargetForKey(event.key)
          if (!intent) return
          // The view resolves the target via navigate() + focuses it; we only
          // suppress the default (page scroll on Arrow keys) here.
          event.preventDefault?.()
        },
        id: tId,
        role: 'button',
        controls: cId,
        expanded: isOpen,
        // `disabled` (declared above) doubles as the AttrBindings flag — the
        // normalizer emits aria-disabled from it; no need to repeat it.
        focusable: !itemDisabled,
      },
      content: {
        open: isOpen,
        id: cId,
        role: 'region',
        labelledBy: tId,
        hidden: !isOpen,
      },
    }
  }

  return {
    value: open,
    setValue,
    parts: {
      root: { id: `accordion:${context.id}` },
    },
    getItem,
    triggerId,
    navigate,
    withItems(nextItems) {
      return buildApi(snapshot, nextItems)
    },
  }
}

export const connectAccordion: Connect<
  AccordionState,
  AccordionContext,
  AccordionEvent,
  AccordionMachineProps,
  AccordionApi,
  AccordionComputed
> = snapshot => buildApi(snapshot, [])

/**
 * Substrate-agnostic reaction: machine open-set → consumer onValueChange, fired
 * identically on every target. Fires whenever the open-set changes.
 */
const reaction = makeReaction<
  AccordionState,
  AccordionContext,
  AccordionEvent,
  AccordionMachineProps,
  AccordionComputed
>()

const onValueChange = reaction(
  m => m.context.value,
  (value, props) => props.onValueChange?.({ value }),
)

connectAccordion.reactions = [onValueChange]
