/**
 * Tooltip machine — substrate-agnostic state machine.
 *
 * States: closed → opening → open → closing
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
 *   - props.ts    — defaults + resolver
 *   - store.ts    — global singleton state
 *   - connect.ts  — logical surface (handlers + attrs)
 *   - index.ts    — public exports
 */

import type { MachineConfig } from '@render-experiment/machine-core'
import { tooltipProps } from './props'
import { tooltipStore } from './store'
import type { TooltipContext, TooltipProps } from './types'

export const tooltipMachine: MachineConfig<TooltipContext, TooltipProps> = {
  initial: props => {
    const r = tooltipProps(props)
    return (r.open ?? r.defaultOpen) ? 'open' : 'closed'
  },

  context: props => ({
    hasPointerMoveOpened: false,
    hasInstantOpen: false,
    placement: tooltipProps(props).positioning.placement,
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
      isHoverableContent: ({ props }) => !tooltipProps(props).disableHoverableContent,
    },

    actions: {
      invokeOnOpen: ({ props }) => {
        tooltipProps(props).onOpenChange?.({ open: true })
      },
      invokeOnClose: ({ props }) => {
        tooltipProps(props).onOpenChange?.({ open: false })
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
        const { id, skipDelayDuration } = tooltipProps(props)
        tooltipStore.setOpen(id)
        if (skipDelayDuration > 0) {
          tooltipStore.startSkipWindow(skipDelayDuration)
        }
      },
      clearGlobalId: ({ props }) => {
        const { id } = tooltipProps(props)
        if (tooltipStore.get().openId === id) {
          tooltipStore.setOpen(null)
        }
      },
    },

    effects: {
      waitForOpenDelay: ({ props, send }) => {
        const id = setTimeout(
          () => send({ type: 'after.openDelay' }),
          tooltipProps(props).openDelay,
        )
        return () => clearTimeout(id)
      },

      waitForCloseDelay: ({ props, send }) => {
        const id = setTimeout(
          () => send({ type: 'after.closeDelay' }),
          tooltipProps(props).closeDelay,
        )
        return () => clearTimeout(id)
      },

      // Substrate-specific: each adapter (React DOM, React Native, …)
      // overrides this via withAdapter() in its api.ts. Core defines
      // the name and a no-op so the machine references stay valid.
      trackEscapeKey: () => undefined,

      trackGlobalStore: ({ props, send }) => {
        const { id } = tooltipProps(props)
        return tooltipStore.subscribe(() => {
          if (tooltipStore.get().openId !== id && tooltipStore.get().openId !== null) {
            send({ type: 'close', src: 'store.id.change' })
          }
        })
      },
    },
  },
}
