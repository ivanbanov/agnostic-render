import { setup, type Machine } from '@render-experiment/machine-core'
import type {
  AccordionComputed,
  AccordionContext,
  AccordionEvent,
  AccordionMachineProps,
  AccordionState,
} from './types'
import { toggleValue } from './utils'

// Named impls registered once (they read context / event, never props) — so a
// state's `guard`/`actions` name is checked against these.
const { createMachine } = setup<AccordionContext, AccordionEvent, AccordionComputed>().config({
  guards: {
    isDisabled: ({ context }) => context.disabled,
  },

  actions: {
    applyToggle: ({ context, setContext, event }) => {
      if (event.type !== 'item.toggle') return
      setContext({ value: toggleValue(context, event.value) })
    },
    applyValueSet: ({ context, setContext, event }) => {
      if (event.type !== 'value.set') return
      // Respect single-mode invariant on external sets too.
      const next = context.type === 'single' ? event.value.slice(0, 1) : event.value.slice()
      setContext({ value: next })
    },
  },
})

export function accordionMachineConfig(props: AccordionMachineProps) {
  const seed = props.value ?? props.defaultValue
  const initialValue = props.type === 'single' ? seed.slice(0, 1) : seed.slice()

  const context: AccordionContext = {
    id: props.id,
    type: props.type,
    collapsible: props.collapsible,
    disabled: props.disabled,
    loop: props.loop,
    orientation: props.orientation,
    value: initialValue,
  }

  return createMachine({
    initial: 'idle',
    context,

    computed: {
      rootId: ({ context }) => `accordion:${context.id}`,
    },

    states: {
      idle: {
        on: {
          'item.toggle': [
            // Whole-accordion disabled → swallow. (Per-item disabled is gated
            // in connect, which never sends the event for a disabled trigger.)
            { guard: 'isDisabled' },
            { actions: ['applyToggle'] },
          ],
          'value.set': { actions: ['applyValueSet'] },
          // Header navigation resolves the next trigger in the connector and
          // moves focus in the view — no context mutation needed here. The
          // events exist so the machine is the single owner of the nav model;
          // the connector reads loop/orientation off context to resolve them.
        },
      },
    },
  })
}

/** The config type produced by `accordionMachineConfig`. */
export type AccordionMachineConfig = ReturnType<typeof accordionMachineConfig>

/** The running accordion machine service type (built by the bridge). */
export type AccordionMachine = Machine<
  AccordionState,
  AccordionContext,
  AccordionEvent,
  AccordionComputed
>
