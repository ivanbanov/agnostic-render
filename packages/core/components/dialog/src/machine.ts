/**
 * Dialog machine — substrate-agnostic state machine.
 *
 * States: closed ↔ open
 *
 * The machine never sees props (see ARCHITECTURE.md). `dialogMachineConfig`
 * takes the resolved props ONCE, seeds the config the transitions need into
 * context (id, modal), and computes the initial state. From then on it reads
 * only context/events.
 *
 * Callbacks (onOpenChange) and controlled `open` are NOT here — the connector
 * observes the machine and fires them (see connect.ts reactions).
 *
 * Escape + outside-pointer-down are NOT machine effects: their listeners and
 * prevent-able vetoes live in the target's effects/handlers, which then send the
 * plain `escape` / `outside.pointer.down` events the machine already handles.
 *
 * Sibling files: types.ts · props.ts · connect.ts · parts.ts · utils.ts · index.ts
 */

import { setup, type Machine } from '@render-experiment/machine-core'
import type {
  DialogComputed,
  DialogContext,
  DialogEvent,
  DialogMachineProps,
  DialogState,
} from './types'

/**
 * Build the dialog machine CONFIG from already-resolved props (defaults
 * applied). Props are read ONCE here to seed context + initial state. The dialog
 * has no named impls (its transitions are unconditional), so it uses the
 * lightweight `setup().createMachine(...)` — no registry, no name-checking needed.
 */
export function dialogMachineConfig(props: DialogMachineProps) {
  const context: DialogContext = {
    id: props.id,
    modal: props.modal,
  }

  return setup<DialogContext, DialogEvent, DialogComputed>().createMachine({
    initial: (props.open ?? props.defaultOpen) ? 'open' : 'closed',
    context,

    computed: {
      presentation: ({ state }) => state,
      contentId: ({ context }) => `dialog:${context.id}:content`,
      titleId: ({ context }) => `dialog:${context.id}:title`,
      descriptionId: ({ context }) => `dialog:${context.id}:description`,
    },

    states: {
      closed: {
        on: {
          open: { target: 'open' },
          toggle: { target: 'open' },
        },
      },
      open: {
        on: {
          close: { target: 'closed' },
          toggle: { target: 'closed' },
          // escape / outside.pointer.down are sent by the target AFTER its
          // prevent-able veto; the machine just closes (behavior is portable).
          escape: { target: 'closed' },
          'outside.pointer.down': { target: 'closed' },
        },
      },
    },
  })
}

/** The config type produced by `dialogMachineConfig`. */
export type DialogMachineConfig = ReturnType<typeof dialogMachineConfig>

/** The running dialog machine service type (built by the bridge). */
export type DialogMachine = Machine<DialogState, DialogContext, DialogEvent, DialogComputed>
