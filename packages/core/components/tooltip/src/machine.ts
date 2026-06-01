/**
 * Tooltip machine — substrate-agnostic state machine.
 *
 * States: closed → opening → open → closing
 *
 * Receives ALREADY-RESOLVED config (`TooltipMachineProps`) — defaults are
 * applied once at the adapter entry, so every field on `props` is concrete
 * and read directly.
 *
 * Feature parity with the SPEC.md contract:
 *   - openDelay / closeDelay (Provider-inheritable, Root override)
 *   - skipDelayDuration window (per-tooltip; Provider-inheritable)
 *   - closeOnEscape — adapter listens; machine receives "escape" event
 *   - disableHoverableContent — inverse of legacy "interactive"
 *   - disabled — suppresses opens
 *   - controlled `open` + `onOpenChange`
 *   - global single-tooltip store (only one open at a time)
 *
 * What is NOT here (intentional):
 *   - DOM event listeners outside the named effects
 *   - aria-* / role / data-* / style — those live in the connect's logical output
 *
 * Sibling files:
 *   - types.ts    — public types
 *   - props.ts    — defaults (resolution is a spread at the adapter entry)
 *   - store.ts    — global singleton state
 *   - connect.ts  — logical surface (handlers + attrs)
 *   - index.ts    — public exports
 */

import { setup } from '@render-experiment/machine-core'
import { tooltipStore } from './store'
import type { TooltipSchema } from './types'

export const tooltipMachine = setup<TooltipSchema>().createMachine({
  initial: props => ((props.open ?? props.defaultOpen) ? 'open' : 'closed'),

  context: props => ({
    hasPointerMoveOpened: false,
    hasInstantOpen: false,
    placement: props.placement,
  }),

  states: {
    closed: {
      entry: ['clearGlobalId'],
      on: {
        open: { target: 'open', actions: ['invokeOnOpen'] },
        'pointer.move': [
          {
            guard: 'shouldSkipDelay',
            target: 'open',
            actions: ['setPointerMoveOpened', 'setInstantOpen', 'invokeOnOpen'],
          },
          { target: 'opening' },
        ],
        'pointer.leave': { actions: ['clearPointerMoveOpened'] },
      },
    },

    opening: {
      effects: ['waitForOpenDelay'],
      on: {
        'after.openDelay': {
          target: 'open',
          actions: ['setPointerMoveOpened', 'clearInstantOpen', 'invokeOnOpen'],
        },
        open: { target: 'open', actions: ['invokeOnOpen'] },
        close: { target: 'closed', actions: ['invokeOnClose'] },
        'pointer.leave': {
          target: 'closed',
          actions: ['clearPointerMoveOpened'],
        },
      },
    },

    open: {
      effects: ['trackEscapeKey', 'trackGlobalStore'],
      entry: ['setGlobalId'],
      on: {
        close: { target: 'closed', actions: ['invokeOnClose'] },
        'pointer.leave': [
          { guard: 'isHoverableContent', target: 'closing' },
          {
            target: 'closed',
            actions: ['clearPointerMoveOpened', 'invokeOnClose'],
          },
        ],
        'content.pointer.leave': {
          guard: 'isHoverableContent',
          target: 'closing',
        },
      },
    },

    closing: {
      effects: ['waitForCloseDelay'],
      on: {
        'after.closeDelay': {
          target: 'closed',
          actions: ['clearPointerMoveOpened', 'invokeOnClose'],
        },
        'content.pointer.move': { target: 'open' },
        'pointer.move': { target: 'open' },
        open: { target: 'open', actions: ['invokeOnOpen'] },
      },
    },
  },

  implementations: {
    guards: {
      shouldSkipDelay: () => tooltipStore.isInSkipWindow(),
      /** Inverse of disableHoverableContent — pointer can dwell on Content. */
      isHoverableContent: ({ props }) => !props.disableHoverableContent,
    },

    actions: {
      invokeOnOpen: ({ props }) => {
        props.onOpenChange?.({ open: true })
      },
      invokeOnClose: ({ props }) => {
        props.onOpenChange?.({ open: false })
      },
      setPointerMoveOpened: ({ setContext }) => {
        setContext({ hasPointerMoveOpened: true })
      },
      clearPointerMoveOpened: ({ setContext }) => {
        setContext({ hasPointerMoveOpened: false })
      },
      setInstantOpen: ({ setContext }) => {
        setContext({ hasInstantOpen: true })
      },
      clearInstantOpen: ({ setContext }) => {
        setContext({ hasInstantOpen: false })
      },
      setGlobalId: ({ props }) => {
        const { id, skipDelayDuration } = props
        tooltipStore.setOpen(id)
        if (skipDelayDuration > 0) {
          tooltipStore.startSkipWindow(skipDelayDuration)
        }
      },
      clearGlobalId: ({ props }) => {
        if (tooltipStore.get().openId === props.id) {
          tooltipStore.setOpen(null)
        }
      },
    },

    effects: {
      waitForOpenDelay: ({ props, send }) => {
        const id = setTimeout(() => send({ type: 'after.openDelay' }), props.openDelay)
        return () => clearTimeout(id)
      },

      waitForCloseDelay: ({ props, send }) => {
        const id = setTimeout(() => send({ type: 'after.closeDelay' }), props.closeDelay)
        return () => clearTimeout(id)
      },

      // Substrate-specific: each adapter (React DOM, React Native, …)
      // overrides this via withAdapter() in its api.ts. Core defines
      // the name and a no-op so the machine references stay valid.
      trackEscapeKey: () => undefined,

      trackGlobalStore: ({ props, send }) => {
        const { id } = props
        return tooltipStore.subscribe(() => {
          if (tooltipStore.get().openId !== id && tooltipStore.get().openId !== null) {
            send({ type: 'close', src: 'store.id.change' })
          }
        })
      },
    },
  },
})
