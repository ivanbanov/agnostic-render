/**
 * Tooltip machine — substrate-agnostic state machine.
 *
 * States: closed → opening → open → closing
 *
 * Feature parity with @zag-js/tooltip:
 *   - openDelay / closeDelay
 *   - skip-delay window (once one tooltip opens, others open instantly briefly)
 *   - closeOnEscape, closeOnClick, closeOnPointerDown
 *   - interactive (don't close while pointer is over content)
 *   - disabled
 *   - controlled `open` + `onOpenChange`
 *   - global single-tooltip store (only one open at a time)
 *   - positioning placement (logical — adapter resolves to renderer coords)
 *
 * What is NOT here (intentional):
 *   - DOM event listeners outside the named effects
 *   - Floating UI / popper — positioning is a logical record, adapters translate
 *   - aria-* / role / data-* / style — those live in the connect's logical output
 *
 * Sibling files:
 *   - types.ts    — public types (Placement, TooltipProps, TooltipApi, …)
 *   - props.ts    — defaults + resolver (raw props → resolved)
 *   - store.ts    — global singleton state
 *   - connect.ts  — logical surface (handlers + attrs the view consumes)
 *   - elements/   — paint-only style specs per element
 *   - index.ts    — public exports
 */

import type { MachineConfig } from "@render-experiment/machine-core";
import { TOOLTIP_SKIP_DELAY_MS, tooltipProps } from "./props";
import { tooltipStore } from "./store";
import type {
  TooltipContext,
  TooltipProps,
} from "./types";

export const tooltipMachine: MachineConfig<TooltipContext, TooltipProps> = {
  initial: (props) => {
    const r = tooltipProps(props);
    return r.open ?? r.defaultOpen ? "open" : "closed";
  },

  context: (props) => ({
    hasPointerMoveOpened: false,
    placement: tooltipProps(props).positioning.placement,
  }),

  states: {
    closed: {
      entry: ["clearGlobalId"],
      on: {
        open: { target: "open", actions: ["invokeOnOpen"] },
        "pointer.move": [
          {
            guard: "shouldSkipDelay",
            target: "open",
            actions: ["setPointerMoveOpened", "invokeOnOpen"],
          },
          { target: "opening" },
        ],
        "pointer.leave": { actions: ["clearPointerMoveOpened"] },
      },
    },

    opening: {
      effects: ["waitForOpenDelay"],
      on: {
        "after.openDelay": {
          target: "open",
          actions: ["setPointerMoveOpened", "invokeOnOpen"],
        },
        open: { target: "open", actions: ["invokeOnOpen"] },
        close: { target: "closed", actions: ["invokeOnClose"] },
        "pointer.leave": {
          target: "closed",
          actions: ["clearPointerMoveOpened"],
        },
      },
    },

    open: {
      effects: ["trackEscapeKey", "trackGlobalStore"],
      entry: ["setGlobalId"],
      on: {
        close: { target: "closed", actions: ["invokeOnClose"] },
        "pointer.leave": [
          { guard: "isInteractive", target: "closing" },
          {
            target: "closed",
            actions: ["clearPointerMoveOpened", "invokeOnClose"],
          },
        ],
        "content.pointer.leave": { guard: "isInteractive", target: "closing" },
      },
    },

    closing: {
      effects: ["waitForCloseDelay"],
      on: {
        "after.closeDelay": {
          target: "closed",
          actions: ["clearPointerMoveOpened", "invokeOnClose"],
        },
        "content.pointer.move": { target: "open" },
        "pointer.move": { target: "open" },
        open: { target: "open", actions: ["invokeOnOpen"] },
      },
    },
  },

  implementations: {
    guards: {
      shouldSkipDelay: () => tooltipStore.isInSkipWindow(),
      isInteractive: ({ props }) => !!tooltipProps(props).interactive,
    },

    actions: {
      invokeOnOpen: ({ props }) => {
        tooltipProps(props).onOpenChange?.({ open: true });
      },
      invokeOnClose: ({ props }) => {
        tooltipProps(props).onOpenChange?.({ open: false });
      },
      setPointerMoveOpened: ({ setContext }) => {
        setContext({ hasPointerMoveOpened: true });
      },
      clearPointerMoveOpened: ({ setContext }) => {
        setContext({ hasPointerMoveOpened: false });
      },
      setGlobalId: ({ props }) => {
        const { id } = tooltipProps(props);
        tooltipStore.setOpen(id);
        tooltipStore.startSkipWindow(TOOLTIP_SKIP_DELAY_MS);
      },
      clearGlobalId: ({ props }) => {
        const { id } = tooltipProps(props);
        if (tooltipStore.get().openId === id) {
          tooltipStore.setOpen(null);
        }
      },
    },

    effects: {
      waitForOpenDelay: ({ props, send }) => {
        const id = setTimeout(
          () => send({ type: "after.openDelay" }),
          tooltipProps(props).openDelay,
        );
        return () => clearTimeout(id);
      },

      waitForCloseDelay: ({ props, send }) => {
        const id = setTimeout(
          () => send({ type: "after.closeDelay" }),
          tooltipProps(props).closeDelay,
        );
        return () => clearTimeout(id);
      },

      // Substrate-specific: each adapter (React DOM, React Native, …)
      // overrides this via withAdapter() in its api.ts. Core defines
      // the name and a no-op so the machine references stay valid.
      trackEscapeKey: () => undefined,

      trackGlobalStore: ({ props, send }) => {
        const { id } = tooltipProps(props);
        return tooltipStore.subscribe(() => {
          if (tooltipStore.get().openId !== id && tooltipStore.get().openId !== null) {
            send({ type: "close", src: "store.id.change" });
          }
        });
      },
    },
  },
};
