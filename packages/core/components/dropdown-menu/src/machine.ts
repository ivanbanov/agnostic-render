/**
 * DropdownMenu machine — substrate-agnostic state machine.
 *
 * States: closed → open → closed
 *
 * Mirrors the W3C menu-button pattern + Radix's DropdownMenu behavior:
 *   - Click trigger to toggle
 *   - Arrow / Enter / Space on trigger to open with focus on first item
 *   - Up Arrow on trigger to open with focus on last item
 *   - Arrow Up/Down to navigate; Home/End to jump
 *   - Enter / Space to activate; Escape to close
 *   - Type-ahead (printable chars match item text)
 *   - Tab closes the menu
 *   - Global single-open store: opening one closes any other
 *
 * What is NOT here (intentional):
 *   - DOM event listeners outside named effects (substrate-specific)
 *   - Submenus / intent polygon / parent-child wiring (v2)
 *   - Modal backdrop, portal, focus trap (render-layer concerns)
 *
 * Sibling files:
 *   - types.ts    — public types
 *   - props.ts    — defaults + resolver
 *   - store.ts    — global singleton state
 *   - connect.ts  — logical surface (handlers + attrs the view consumes)
 *   - utils.ts    — item walkers (step, typeaheadFind, …)
 *   - elements/   — paint-only style specs per element
 *   - index.ts    — public exports
 */

import type { MachineConfig } from '@render-experiment/machine-core'
import { dropdownMenuProps, TYPEAHEAD_RESET_MS } from './props'
import { dropdownMenuStore } from './store'
import type { DropdownMenuContext, DropdownMenuEvent, DropdownMenuProps } from './types'
import { firstEnabled, lastEnabled, makeSelectEvent, step, typeaheadFind } from './utils'

export const dropdownMenuMachine: MachineConfig<
  DropdownMenuContext,
  DropdownMenuProps,
  DropdownMenuEvent
> = {
  initial: props => {
    const r = dropdownMenuProps(props)
    return (r.open ?? r.defaultOpen) ? 'open' : 'closed'
  },

  context: props => ({
    highlightedValue: null,
    suspendPointer: false,
    currentPlacement: dropdownMenuProps(props).positioning.placement,
    typeaheadBuffer: '',
    typeaheadLastTime: 0,
    pendingHighlight: null,
  }),

  states: {
    closed: {
      entry: ['clearGlobalId', 'clearHighlight', 'clearPendingHighlight'],
      on: {
        'trigger.click': {
          target: 'open',
          actions: ['invokeOnOpen', 'setGlobalId'],
        },
        'trigger.key.open': {
          target: 'open',
          actions: ['invokeOnOpen', 'setGlobalId', 'setPendingFirst'],
        },
        'trigger.key.open.last': {
          target: 'open',
          actions: ['invokeOnOpen', 'setGlobalId', 'setPendingLast'],
        },
        open: {
          target: 'open',
          actions: ['invokeOnOpen', 'setGlobalId'],
        },
      },
    },

    open: {
      effects: ['trackEscapeKey', 'trackGlobalStore'],
      on: {
        close: { target: 'closed', actions: ['invokeOnClose'] },
        'trigger.click': { target: 'closed', actions: ['invokeOnClose'] },
        escape: { target: 'closed', actions: ['invokeOnClose'] },

        'item.pointermove': { actions: ['highlightItem'] },
        'item.pointerleave': { actions: ['clearHighlightIfMatch'] },
        'item.click': [
          {
            guard: 'shouldCloseOnSelect',
            target: 'closed',
            // onSelect was already invoked synchronously at the connect's
            // call site so the guard could read event.defaultPrevented.
            actions: ['invokeOnClose'],
          },
          {},
        ],

        'arrow.down': { actions: ['suspendPointer', 'highlightNext'] },
        'arrow.up': { actions: ['suspendPointer', 'highlightPrev'] },
        home: { actions: ['suspendPointer', 'highlightFirst'] },
        end: { actions: ['suspendPointer', 'highlightLast'] },

        enter: { actions: ['clickHighlightedItem'] },
        space: { actions: ['clickHighlightedItem'] },

        'typeahead.char': { actions: ['typeaheadMatch'] },

        'pointer.resume': { actions: ['resumePointer'] },

        'items.ready': { actions: ['applyPendingHighlight'] },
      },
    },
  },

  implementations: {
    guards: {
      shouldCloseOnSelect: ({ props, event }) => {
        // Only meaningful for `item.click`. Guarding by type also narrows
        // the payload so `selectEvent` / `closeOnSelect` are typed.
        if (event.type !== 'item.click') return false
        // Consumer can cancel close via onSelect(event).preventDefault().
        if (event.selectEvent.defaultPrevented) return false
        // Per-item override (false for checkbox/radio); otherwise resolved prop.
        if (event.closeOnSelect !== undefined) return event.closeOnSelect
        return dropdownMenuProps(props).closeOnSelect
      },
    },

    actions: {
      invokeOnOpen: ({ props }) => {
        dropdownMenuProps(props).onOpenChange?.({ open: true })
      },
      invokeOnClose: ({ props }) => {
        dropdownMenuProps(props).onOpenChange?.({ open: false })
      },
      setGlobalId: ({ props }) => {
        dropdownMenuStore.setOpen(dropdownMenuProps(props).id)
      },
      clearGlobalId: ({ props }) => {
        const { id } = dropdownMenuProps(props)
        if (dropdownMenuStore.get().openId === id) {
          dropdownMenuStore.setOpen(null)
        }
      },

      clearHighlight: ({ setContext }) => {
        setContext({ highlightedValue: null })
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
      suspendPointer: ({ setContext }) => {
        setContext({ suspendPointer: true })
      },
      resumePointer: ({ setContext }) => {
        setContext({ suspendPointer: false })
      },

      setPendingFirst: ({ setContext }) => {
        setContext({ pendingHighlight: 'first' })
      },
      setPendingLast: ({ setContext }) => {
        setContext({ pendingHighlight: 'last' })
      },
      clearPendingHighlight: ({ setContext }) => {
        setContext({ pendingHighlight: null })
      },
      applyPendingHighlight: ({ context, setContext, event }) => {
        if (!context.pendingHighlight) return
        if (!('items' in event)) return
        const next =
          context.pendingHighlight === 'first'
            ? firstEnabled(event.items)
            : lastEnabled(event.items)
        if (next) {
          setContext({
            highlightedValue: next.value,
            pendingHighlight: null,
          })
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
      highlightNext: ({ context, setContext, props, event }) => {
        if (!('items' in event)) return
        const next = step(event.items, context.highlightedValue, 1, dropdownMenuProps(props).loop)
        if (next) setContext({ highlightedValue: next.value })
      },
      highlightPrev: ({ context, setContext, props, event }) => {
        if (!('items' in event)) return
        const next = step(event.items, context.highlightedValue, -1, dropdownMenuProps(props).loop)
        if (next) setContext({ highlightedValue: next.value })
      },

      clickHighlightedItem: ({ context, send, event }) => {
        if (!('items' in event)) return
        const current = event.items.find(i => i.value === context.highlightedValue)
        if (!current || current.disabled) return
        // Invoke onSelect synchronously so the guard can read
        // event.defaultPrevented — matches the pointer-click path in
        // connect.ts.
        const selectEvent = makeSelectEvent()
        current.onSelect?.(selectEvent)
        send({
          type: 'item.click',
          value: current.value,
          onSelect: current.onSelect,
          selectEvent,
          // explicit per-item override; falls through to default behavior
          // when undefined (regular items close, toggles don't)
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
      // Substrate-specific: each adapter overrides via withAdapter().
      trackEscapeKey: () => undefined,

      trackGlobalStore: ({ props, send }) => {
        const { id } = dropdownMenuProps(props)
        return dropdownMenuStore.subscribe(() => {
          const openId = dropdownMenuStore.get().openId
          if (openId !== id && openId !== null) {
            send({ type: 'close', src: 'store.id.change' })
          }
        })
      },
    },
  },
}
