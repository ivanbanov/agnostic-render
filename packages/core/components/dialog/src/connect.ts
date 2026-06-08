/**
 * Dialog connect — a pure mapping from the machine snapshot (+ props) to the
 * logical surface the view spreads.
 *
 * Output is substrate-agnostic: handlers (`onPress`) + attrs (`id`, `role`,
 * `labelledBy`, `describedBy`, `modal`, `expanded`, `controls`, `hasPopup`) in
 * one flat bag per part. Core emits no `data-*` — each adapter derives whatever
 * it wants from the machine state + these fields.
 *
 * This is pure — it runs on every snapshot read and must not fire side effects.
 * Consumer callbacks (onOpenChange) are fired by the connector via the reaction
 * declared at the bottom; the machine never reads props or fires them. Escape +
 * outside-pointer-down are platform listeners, so they live in the target.
 *
 * Sibling files: machine.ts · types.ts · props.ts · utils.ts
 */

import type { Connect } from '@render-experiment/machine-core'
import { makeReaction } from '@render-experiment/machine-core'
import type {
  DialogApi,
  DialogComputed,
  DialogContext,
  DialogEvent,
  DialogMachineProps,
  DialogState,
} from './types'

export const connectDialog: Connect<
  DialogState,
  DialogContext,
  DialogEvent,
  DialogMachineProps,
  DialogApi,
  DialogComputed
> = ({ state, computed, props, send }) => {
  const open = state === 'open'
  const { contentId, titleId, descriptionId } = computed
  const triggerId = `dialog:${props.id}:trigger`

  return {
    open,
    presentation: computed.presentation,
    modal: props.modal,
    setOpen(next) {
      if (open === next) return
      send({ type: next ? 'open' : 'close' })
    },
    parts: {
      trigger: {
        onPress: () => send({ type: 'toggle', src: 'trigger.press' }),
        id: triggerId,
        role: 'button',
        hasPopup: 'dialog',
        expanded: open,
        controls: open ? contentId : undefined,
      },
      // The backdrop. The outside-pointer-down decision runs in the target
      // (it needs the DOM event + the prevent-able veto), so no handler here.
      overlay: {
        hidden: !open,
      },
      content: {
        id: contentId,
        role: 'dialog',
        // aria-modal only when the dialog is genuinely modal (page inert).
        modal: props.modal ? true : undefined,
        labelledBy: titleId,
        describedBy: descriptionId,
        // The content owns the single tab stop the focus manager targets when
        // there's nothing focusable inside.
        focusable: true,
      },
      title: {
        id: titleId,
      },
      description: {
        id: descriptionId,
      },
      close: {
        onPress: () => send({ type: 'close', src: 'close.press' }),
        role: 'button',
      },
    },
  }
}

/**
 * Substrate-agnostic reaction: machine open/closed → consumer onOpenChange,
 * fired identically on every target. (Escape + outside-pointer-down are platform
 * listeners, so they live in each target's effects/handlers, not here.)
 */
const reaction = makeReaction<
  DialogState,
  DialogContext,
  DialogEvent,
  DialogMachineProps,
  DialogComputed
>()

const onOpenChange = reaction(
  m => m.matches('open'),
  (open, props) => props.onOpenChange?.({ open }),
)

connectDialog.reactions = [onOpenChange]
