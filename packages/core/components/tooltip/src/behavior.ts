/**
 * Tooltip behavior — substrate-agnostic state machine.
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
 *   - types.ts   — public types (Placement, TooltipProps, TooltipApi, …)
 *   - props.ts   — defaults + resolver (raw props → resolved)
 *   - styles.ts  — paint-only style specs per element
 *   - index.ts   — public exports
 */

import {
  createStore,
  type BehaviorConfig,
} from "@render-experiment/behavior-core";
import { TOOLTIP_SKIP_DELAY_MS, tooltipProps } from "./props";
import type {
  TooltipApi,
  TooltipContext,
  TooltipProps,
  TooltipState,
} from "./types";

// -----------------------------------------------------------------------------
// Global "only one tooltip open at a time" store + skip-delay window
// -----------------------------------------------------------------------------

interface TooltipStoreState {
  openId: string | null;
  /** When non-null, new tooltips skip openDelay until skipUntil. */
  skipUntil: number | null;
}

const store = createStore<TooltipStoreState>({
  openId: null,
  skipUntil: null,
});

export const tooltipStore = {
  get: store.get,
  subscribe: store.subscribe,
  setOpen(id: string | null) {
    store.set((s) => ({ ...s, openId: id }));
  },
  startSkipWindow(ms: number) {
    store.set((s) => ({ ...s, skipUntil: Date.now() + ms }));
  },
  endSkipWindow() {
    store.set((s) => ({ ...s, skipUntil: null }));
  },
  isInSkipWindow() {
    const { skipUntil } = store.get();
    return skipUntil !== null && Date.now() < skipUntil;
  },
};

// -----------------------------------------------------------------------------
// Behavior config
// -----------------------------------------------------------------------------

export const tooltipBehavior: BehaviorConfig<TooltipContext, TooltipProps> = {
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

      trackEscapeKey: ({ props, send }) => {
        if (!tooltipProps(props).closeOnEscape) return;
        // DOM-bound on web — target-react owns this effect implementation
        // and an alternative target (Surface, RN) supplies its own.
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key !== "Escape") return;
          event.stopPropagation();
          send({ type: "close", src: "keydown.escape" });
        };
        document.addEventListener("keydown", onKeyDown, true);
        return () => document.removeEventListener("keydown", onKeyDown, true);
      },

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

// -----------------------------------------------------------------------------
// connect — produces a LOGICAL surface, not DOM props
// -----------------------------------------------------------------------------

export function connect(
  state: TooltipState,
  context: TooltipContext,
  props: TooltipProps,
  send: (event: { type: string; [key: string]: unknown }) => void,
): TooltipApi {
  void context;
  const r = tooltipProps(props);
  const open = state === "open" || state === "closing";
  const triggerId = `tooltip:${r.id}:trigger`;
  const contentId = `tooltip:${r.id}:content`;

  return {
    open,
    state,
    setOpen(next) {
      if (open === next) return;
      send({ type: next ? "open" : "close" });
    },
    trigger: {
      handlers: {
        onPointerMove: (event) => {
          if (event?.defaultPrevented) return;
          if (r.disabled) return;
          if (event?.pointerType === "touch") return;
          send({ type: "pointer.move" });
        },
        onPointerLeave: () => {
          if (r.disabled) return;
          send({ type: "pointer.leave" });
        },
        onPointerDown: (event) => {
          if (event?.defaultPrevented) return;
          if (r.disabled) return;
          if (event?.button !== undefined && event.button !== 0) return;
          if (!r.closeOnPointerDown) return;
          send({ type: "close", src: "trigger.pointerdown" });
        },
        onPress: (event) => {
          if (event?.defaultPrevented) return;
          if (r.disabled) return;
          if (!r.closeOnClick) return;
          send({ type: "close", src: "trigger.click" });
        },
        onFocus: () => {
          if (r.disabled) return;
          send({ type: "open", src: "trigger.focus" });
        },
        onBlur: () => {
          if (r.disabled) return;
          send({ type: "close", src: "trigger.blur" });
        },
      },
      attrs: {
        id: triggerId,
        describedBy: open ? contentId : undefined,
        disabled: r.disabled,
      },
    },
    content: {
      handlers: {
        onPointerEnter: () => {
          if (!r.interactive) return;
          send({ type: "content.pointer.move" });
        },
        onPointerLeave: () => {
          if (!r.interactive) return;
          send({ type: "content.pointer.leave" });
        },
      },
      attrs: {
        id: contentId,
        role: "tooltip",
      },
      positioning: r.positioning,
      rendered: open,
    },
  };
}
