import { act, config, type Machine } from '@render-experiment/machine-core'
import { tooltipStore } from './store'
import type {
  TooltipComputed,
  TooltipContext,
  TooltipEvent,
  TooltipMachineProps,
  TooltipState,
} from './types'

/**
 * Build the tooltip machine CONFIG from already-resolved props (defaults
 * applied). Returns a config — the target bridge applies its adapter
 * (withAdapter) and builds the running machine, so platform effects stay at
 * the edge. Props are read ONCE here to seed context + initial state.
 */
export function tooltipMachineConfig(props: TooltipMachineProps) {
  const openInitially = props.open ?? props.defaultOpen

  const context: TooltipContext = {
    id: props.id,
    placement: props.placement,
    openDelay: props.openDelay,
    closeDelay: props.closeDelay,
    skipDelayDuration: props.skipDelayDuration,
    disableHoverableContent: props.disableHoverableContent,
    // A controlled / default-open tooltip is shown without a hover delay → instant.
    timing: openInitially ? 'instant' : null,
  }

  return config<TooltipState, TooltipContext, TooltipEvent, TooltipComputed>({
    initial: openInitially ? 'open' : 'closed',
    context,

    computed: {
      // Presentation state: a PRODUCT of the control axis (state) and the data
      // axis (timing) — derived, never stored as its own state node. Closed (or
      // still pending in `opening`) reads as closed; once visible the value is
      // literally `${timing}-open`, built from timing rather than re-spelled.
      // Targets map this semantic value however they paint (a DOM target as a
      // `data-state` attr, a canvas target as a style key) — core stays blind to
      // how it's rendered.
      presentation: ({ context, state }) =>
        state === 'closed' || state === 'opening' || context.timing === null
          ? 'closed'
          : `${context.timing}-open`,
    },

    states: {
      closed: {
        // Clear the timing axis on every entry into closed — the next open
        // re-stamps it. (clearGlobalId releases the single-open slot.)
        entry: ['clearGlobalId', act({ timing: null })],
        on: {
          // Focus / controlled open — no hover delay paid → instant.
          open: {
            target: 'open',
            actions: act({ timing: 'instant' }),
          },
          'pointer.move': [
            // Skip-delay window active → open immediately → instant.
            {
              guard: 'shouldSkipDelay',
              target: 'open',
              actions: act({ timing: 'instant' }),
            },
            // Normal hover → wait out openDelay in `opening` → delayed.
            {
              target: 'opening',
              actions: act({ timing: 'delayed' }),
            },
          ],
        },
      },

      opening: {
        // openDelay elapses → open. Auto-cancelled if the pointer leaves first.
        // `timing` was stamped 'delayed' on the way in and carries through.
        after: {
          openDelay: { target: 'open' },
        },
        on: {
          // A focus arriving mid-delay promotes to an instant open.
          open: {
            target: 'open',
            actions: act({ timing: 'instant' }),
          },
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
        // Still visible → keep the existing `timing` so `presentation` stays
        // stable through the grace period; re-entering open from here preserves it.
        after: {
          closeDelay: { target: 'closed' },
        },
        on: {
          'content.pointer.move': { target: 'open' },
          'pointer.move': { target: 'open' },
          open: {
            target: 'open',
            actions: act({ timing: 'instant' }),
          },
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
export type TooltipMachine = Machine<TooltipState, TooltipContext, TooltipEvent, TooltipComputed>
