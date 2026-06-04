/**
 * Tooltip machine — substrate-agnostic state machine.
 *
 * States: closed → opening → open → closing
 *
 * The machine never sees props (see ARCHITECTURE.md). `createTooltipMachine`
 * takes the resolved props ONCE, seeds the config the transitions need into
 * context, and computes the initial state. From then on the machine reads only
 * context/events:
 *   - openDelay / closeDelay → named `after` delays reading context
 *   - skipDelayDuration / id → context, used to drive the global store
 *   - disableHoverableContent → a guard over context
 *   - the single-open store + skip-delay window → store.ts (a shared signal)
 *
 * Callbacks (onOpenChange) and controlled `open` are NOT here — the connector
 * observes the machine and fires them.
 *
 * `trackEscapeKey` is a named effect each adapter overrides via withAdapter().
 *
 * Sibling files: types.ts · props.ts · store.ts · connect.ts · index.ts
 */

import { config, type Machine } from '@render-experiment/machine-core'
import { tooltipStore } from './store'
import type { TooltipContext, TooltipEvent, TooltipMachineProps, TooltipState } from './types'

/**
 * Build the tooltip machine CONFIG from already-resolved props (defaults
 * applied). Returns a config — the target bridge applies its adapter
 * (withAdapter) and builds the running machine, so platform effects stay at
 * the edge. Props are read ONCE here to seed context + initial state.
 */
export function tooltipMachineConfig(props: TooltipMachineProps) {
  const context: TooltipContext = {
    id: props.id,
    placement: props.placement,
    openDelay: props.openDelay,
    closeDelay: props.closeDelay,
    skipDelayDuration: props.skipDelayDuration,
    disableHoverableContent: props.disableHoverableContent,
  }

  return config<TooltipState, TooltipContext, TooltipEvent>({
    initial: (props.open ?? props.defaultOpen) ? 'open' : 'closed',
    context,

    states: {
      closed: {
        entry: ['clearGlobalId'],
        on: {
          open: { target: 'open' },
          'pointer.move': [{ guard: 'shouldSkipDelay', target: 'open' }, { target: 'opening' }],
        },
      },

      opening: {
        // openDelay elapses → open. Auto-cancelled if the pointer leaves first.
        after: {
          openDelay: { target: 'open' },
        },
        on: {
          open: { target: 'open' },
          close: { target: 'closed' },
          'pointer.leave': { target: 'closed' },
        },
      },

      open: {
        entry: ['setGlobalId'],
        effects: ['trackGlobalStore'],
        on: {
          close: { target: 'closed' },
          // escape is sent by the target's listener AFTER its prevent-able
          // onEscapeKeyDown gate; the machine just closes (behavior is portable).
          escape: { target: 'closed' },
          'pointer.leave': [
            { guard: 'isHoverableContent', target: 'closing' },
            { target: 'closed' },
          ],
          'content.pointer.leave': { guard: 'isHoverableContent', target: 'closing' },
        },
      },

      closing: {
        after: {
          closeDelay: { target: 'closed' },
        },
        on: {
          'content.pointer.move': { target: 'open' },
          'pointer.move': { target: 'open' },
          open: { target: 'open' },
        },
      },
    },

    implementations: {
      delays: {
        openDelay: ({ context }) => context.openDelay,
        closeDelay: ({ context }) => context.closeDelay,
      },

      guards: {
        shouldSkipDelay: () => tooltipStore.isInSkipWindow(),
        /** Inverse of disableHoverableContent — pointer can dwell on Content. */
        isHoverableContent: ({ context }) => !context.disableHoverableContent,
      },

      actions: {
        setGlobalId: ({ context }) => {
          tooltipStore.setOpen(context.id)
          if (context.skipDelayDuration > 0) {
            tooltipStore.startSkipWindow(context.skipDelayDuration)
          }
        },
        clearGlobalId: ({ context }) => {
          if (tooltipStore.get().openId === context.id) tooltipStore.setOpen(null)
        },
      },

      effects: {
        // While open, watch the global store: if another tooltip claims the
        // single-open slot, close this one. (Escape is NOT a machine effect —
        // its listener + prevent-able gate live in the target adapter, which
        // then sends `escape`.)
        trackGlobalStore: ({ context, send }) =>
          tooltipStore.subscribe(() => {
            const openId = tooltipStore.get().openId
            if (openId !== context.id && openId !== null) {
              send({ type: 'close', src: 'store.id.change' })
            }
          }),
      },
    },
  })
}

/** The config type produced by `tooltipMachineConfig`. */
export type TooltipMachineConfig = ReturnType<typeof tooltipMachineConfig>

/** The running tooltip machine service type (built by the bridge). */
export type TooltipMachine = Machine<TooltipState, TooltipContext, TooltipEvent>
