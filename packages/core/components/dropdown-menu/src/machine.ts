/**
 * DropdownMenu machine — substrate-agnostic state machine.
 *
 * States: closed ↔ open
 *
 * The machine never sees props (see ARCHITECTURE.md). `dropdownMenuMachineConfig`
 * takes the resolved props ONCE, seeds the config the transitions need into
 * context (id, placement, loop, typeahead, closeOnSelect), and computes the
 * initial state. From then on it reads only context/events:
 *   - id → context, drives the global single-open store + derived element ids
 *   - loop / typeahead / closeOnSelect → context, read by guards/actions
 *   - the single-open store → store.ts (a shared signal)
 *
 * Callbacks (onOpenChange) and controlled `open` are NOT here — the connector
 * observes the machine and fires them (see connect.ts reactions).
 *
 * Escape is NOT a machine effect: its listener + prevent-able gate live in the
 * target's effects.ts, which sends the plain `escape` event the machine handles.
 *
 * Sibling files: types.ts · props.ts · store.ts · connect.ts · utils.ts · index.ts
 */

import { act, config, type Machine } from '@render-experiment/machine-core'
import { TYPEAHEAD_RESET_MS } from './props'
import { dropdownMenuStore } from './store'
import type {
  DropdownMenuComputed,
  DropdownMenuContext,
  DropdownMenuEvent,
  DropdownMenuMachineProps,
  DropdownMenuState,
} from './types'
import { firstEnabled, lastEnabled, makeSelectEvent, step, typeaheadFind } from './utils'

/**
 * Build the dropdown-menu machine CONFIG from already-resolved props (defaults
 * applied). Returns a config — the target bridge applies its adapter
 * (withAdapter) and builds the running machine. Props are read ONCE here to
 * seed context + initial state.
 */
export function dropdownMenuMachineConfig(props: DropdownMenuMachineProps) {
  const context: DropdownMenuContext = {
    id: props.id,
    placement: props.placement,
    loop: props.loop,
    typeahead: props.typeahead,
    closeOnSelect: props.closeOnSelect,
    highlightedValue: null,
    suspendPointer: false,
    typeaheadBuffer: '',
    typeaheadLastTime: 0,
    pendingHighlight: null,
  }

  return config<DropdownMenuState, DropdownMenuContext, DropdownMenuEvent, DropdownMenuComputed>({
    initial: (props.open ?? props.defaultOpen) ? 'open' : 'closed',
    context,

    computed: {
      open: ({ state }) => state === 'open',
      triggerId: ({ context }) => `dropdown-menu:${context.id}:trigger`,
      contentId: ({ context }) => `dropdown-menu:${context.id}:content`,
    },

    states: {
      closed: {
        // Release the global slot + reset transient highlight state on close.
        entry: ['clearGlobalId', act({ highlightedValue: null, pendingHighlight: null })],
        on: {
          'trigger.click': { target: 'open', actions: ['setGlobalId'] },
          'trigger.key.open': {
            target: 'open',
            actions: ['setGlobalId', act({ pendingHighlight: 'first' })],
          },
          'trigger.key.open.last': {
            target: 'open',
            actions: ['setGlobalId', act({ pendingHighlight: 'last' })],
          },
          open: { target: 'open', actions: ['setGlobalId'] },
        },
      },

      open: {
        entry: ['setGlobalId'],
        effects: ['trackGlobalStore'],
        on: {
          close: { target: 'closed' },
          'trigger.click': { target: 'closed' },
          escape: { target: 'closed' },

          'item.pointermove': { actions: ['highlightItem'] },
          'item.pointerleave': { actions: ['clearHighlightIfMatch'] },
          'item.click': [
            // onSelect was already invoked synchronously at the connect call
            // site so the guard can read selectEvent.defaultPrevented.
            { guard: 'shouldCloseOnSelect', target: 'closed' },
            {},
          ],

          'arrow.down': { actions: [act({ suspendPointer: true }), 'highlightNext'] },
          'arrow.up': { actions: [act({ suspendPointer: true }), 'highlightPrev'] },
          home: { actions: [act({ suspendPointer: true }), 'highlightFirst'] },
          end: { actions: [act({ suspendPointer: true }), 'highlightLast'] },

          enter: { actions: ['clickHighlightedItem'] },
          space: { actions: ['clickHighlightedItem'] },

          'typeahead.char': { actions: ['typeaheadMatch'] },

          'pointer.resume': { actions: [act({ suspendPointer: false })] },

          'items.ready': { actions: ['applyPendingHighlight'] },
        },
      },
    },

    implementations: {
      guards: {
        shouldCloseOnSelect: ({ context, event }) => {
          // Only meaningful for `item.click`. Guarding by type narrows the
          // payload so `selectEvent` / `closeOnSelect` are typed.
          if (event.type !== 'item.click') return false
          // Consumer can cancel close via onSelect(event).preventDefault().
          if (event.selectEvent.defaultPrevented) return false
          // Per-item override (false for checkbox/radio); else the resolved default.
          if (event.closeOnSelect !== undefined) return event.closeOnSelect
          return context.closeOnSelect
        },
      },

      actions: {
        setGlobalId: ({ context }) => {
          dropdownMenuStore.setOpen(context.id)
        },
        clearGlobalId: ({ context }) => {
          if (dropdownMenuStore.get().openId === context.id) {
            dropdownMenuStore.setOpen(null)
          }
        },

        highlightItem: ({ context, setContext, event }) => {
          if (context.suspendPointer) return
          if (event.type !== 'item.pointermove') return
          setContext({ highlightedValue: event.value })
        },
        clearHighlightIfMatch: ({ context, setContext, event }) => {
          if (context.suspendPointer) return
          if (event.type !== 'item.pointerleave') return
          if (context.highlightedValue === event.value) {
            setContext({ highlightedValue: null })
          }
        },

        applyPendingHighlight: ({ context, setContext, event }) => {
          if (!context.pendingHighlight) return
          if (!('items' in event)) return
          const next =
            context.pendingHighlight === 'first'
              ? firstEnabled(event.items)
              : lastEnabled(event.items)
          if (next) {
            setContext({ highlightedValue: next.value, pendingHighlight: null })
          }
        },

        highlightFirst: ({ setContext, event }) => {
          if (!('items' in event)) return
          const next = firstEnabled(event.items)
          if (next) setContext({ highlightedValue: next.value })
        },
        highlightLast: ({ setContext, event }) => {
          if (!('items' in event)) return
          const next = lastEnabled(event.items)
          if (next) setContext({ highlightedValue: next.value })
        },
        highlightNext: ({ context, setContext, event }) => {
          if (!('items' in event)) return
          const next = step(event.items, context.highlightedValue, 1, context.loop)
          if (next) setContext({ highlightedValue: next.value })
        },
        highlightPrev: ({ context, setContext, event }) => {
          if (!('items' in event)) return
          const next = step(event.items, context.highlightedValue, -1, context.loop)
          if (next) setContext({ highlightedValue: next.value })
        },

        clickHighlightedItem: ({ context, send, event }) => {
          if (!('items' in event)) return
          const current = event.items.find(i => i.value === context.highlightedValue)
          if (!current || current.disabled) return
          // Invoke onSelect synchronously so the guard can read
          // defaultPrevented — matches the pointer-click path in connect.ts.
          const selectEvent = makeSelectEvent()
          current.onSelect?.(selectEvent)
          send({
            type: 'item.click',
            value: current.value,
            onSelect: current.onSelect,
            selectEvent,
            // explicit per-item override; falls through to default behavior
            // when undefined (regular items close, toggles don't).
            closeOnSelect:
              current.closeOnSelect ??
              (current.kind === 'checkbox' || current.kind === 'radio' ? false : undefined),
            items: event.items,
          })
        },

        typeaheadMatch: ({ context, setContext, event }) => {
          if (event.type !== 'typeahead.char') return
          const char = event.char.toLowerCase()
          if (!char) return

          const now = Date.now()
          const expired = now - context.typeaheadLastTime > TYPEAHEAD_RESET_MS
          const buffer = expired ? char : context.typeaheadBuffer + char

          const match = typeaheadFind(event.items, buffer, context.highlightedValue)
          if (match) {
            setContext({
              typeaheadBuffer: buffer,
              typeaheadLastTime: now,
              highlightedValue: match.value,
              suspendPointer: true,
            })
          } else {
            setContext({ typeaheadBuffer: buffer, typeaheadLastTime: now })
          }
        },
      },

      effects: {
        // While open, watch the global store: if another menu claims the
        // single-open slot, close this one. (Escape is NOT a machine effect —
        // its listener lives in the target's effects.ts, which sends `escape`.)
        trackGlobalStore: ({ context, send }) =>
          dropdownMenuStore.subscribe(() => {
            const openId = dropdownMenuStore.get().openId
            if (openId !== context.id && openId !== null) {
              send({ type: 'close', src: 'store.id.change' })
            }
          }),
      },
    },
  })
}

/** The config type produced by `dropdownMenuMachineConfig`. */
export type DropdownMenuMachineConfig = ReturnType<typeof dropdownMenuMachineConfig>

/** The running dropdown-menu machine service type (built by the bridge). */
export type DropdownMenuMachine = Machine<
  DropdownMenuState,
  DropdownMenuContext,
  DropdownMenuEvent,
  DropdownMenuComputed
>
