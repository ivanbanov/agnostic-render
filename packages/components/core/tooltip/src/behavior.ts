/**
 * Tooltip behavior — substrate-agnostic.
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
 */

import type {
  BehaviorConfig,
  LogicalAttrs,
  LogicalHandlers,
} from "@render-experiment/behavior-core";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export type Placement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

export interface PositioningOptions {
  placement: Placement;
  offset: { main: number; cross: number };
}

export interface TooltipProps {
  id: string;
  /** Controlled open state. Pass `undefined` for uncontrolled. */
  open?: boolean;
  defaultOpen?: boolean;
  openDelay?: number;
  closeDelay?: number;
  closeOnEscape?: boolean;
  closeOnClick?: boolean;
  closeOnPointerDown?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  positioning?: Partial<PositioningOptions>;
  onOpenChange?: (details: { open: boolean }) => void;
}

export interface TooltipContext {
  hasPointerMoveOpened: boolean;
  placement: Placement;
}

export type TooltipState = "closed" | "opening" | "open" | "closing";

// -----------------------------------------------------------------------------
// Global "only one tooltip open at a time" store + skip-delay window
// -----------------------------------------------------------------------------

interface TooltipStore {
  openId: string | null;
  /** When non-null, new tooltips skip openDelay until skipUntil. */
  skipUntil: number | null;
}

const store: TooltipStore = { openId: null, skipUntil: null };
const storeListeners = new Set<() => void>();

const notifyStore = () => storeListeners.forEach((l) => l());

export const tooltipStore = {
  get: () => store,
  subscribe(listener: () => void) {
    storeListeners.add(listener);
    return () => storeListeners.delete(listener);
  },
  setOpen(id: string | null) {
    store.openId = id;
    notifyStore();
  },
  startSkipWindow(ms: number) {
    store.skipUntil = Date.now() + ms;
    notifyStore();
  },
  endSkipWindow() {
    store.skipUntil = null;
    notifyStore();
  },
  isInSkipWindow() {
    return store.skipUntil !== null && Date.now() < store.skipUntil;
  },
};

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

const DEFAULT_OPEN_DELAY = 400;
const DEFAULT_CLOSE_DELAY = 150;
const DEFAULT_SKIP_DELAY = 300;

function resolvedProps(props: TooltipProps): Required<
  Omit<TooltipProps, "open" | "defaultOpen" | "onOpenChange" | "positioning">
> & {
  open: boolean | undefined;
  defaultOpen: boolean;
  onOpenChange: TooltipProps["onOpenChange"];
  positioning: PositioningOptions;
} {
  return {
    id: props.id,
    open: props.open,
    defaultOpen: props.defaultOpen ?? false,
    openDelay: props.openDelay ?? DEFAULT_OPEN_DELAY,
    closeDelay: props.closeDelay ?? DEFAULT_CLOSE_DELAY,
    closeOnEscape: props.closeOnEscape ?? true,
    closeOnClick: props.closeOnClick ?? true,
    closeOnPointerDown:
      props.closeOnPointerDown ?? props.closeOnClick ?? true,
    interactive: props.interactive ?? false,
    disabled: props.disabled ?? false,
    onOpenChange: props.onOpenChange,
    positioning: {
      placement: props.positioning?.placement ?? "bottom",
      offset: {
        main: props.positioning?.offset?.main ?? 4,
        cross: props.positioning?.offset?.cross ?? 0,
      },
    },
  };
}

// -----------------------------------------------------------------------------
// Behavior config
// -----------------------------------------------------------------------------

export const tooltipBehavior: BehaviorConfig<TooltipContext, TooltipProps> = {
  initial: (props) => {
    const r = resolvedProps(props);
    return r.open ?? r.defaultOpen ? "open" : "closed";
  },

  context: (props) => ({
    hasPointerMoveOpened: false,
    placement: resolvedProps(props).positioning.placement,
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
      isInteractive: ({ props }) => !!resolvedProps(props).interactive,
    },

    actions: {
      invokeOnOpen: ({ props }) => {
        resolvedProps(props).onOpenChange?.({ open: true });
      },
      invokeOnClose: ({ props }) => {
        resolvedProps(props).onOpenChange?.({ open: false });
      },
      setPointerMoveOpened: ({ setContext }) => {
        setContext({ hasPointerMoveOpened: true });
      },
      clearPointerMoveOpened: ({ setContext }) => {
        setContext({ hasPointerMoveOpened: false });
      },
      setGlobalId: ({ props }) => {
        const { id } = resolvedProps(props);
        tooltipStore.setOpen(id);
        tooltipStore.startSkipWindow(DEFAULT_SKIP_DELAY);
      },
      clearGlobalId: ({ props }) => {
        const { id } = resolvedProps(props);
        if (tooltipStore.get().openId === id) {
          tooltipStore.setOpen(null);
        }
      },
    },

    effects: {
      waitForOpenDelay: ({ props, send }) => {
        const id = setTimeout(
          () => send({ type: "after.openDelay" }),
          resolvedProps(props).openDelay,
        );
        return () => clearTimeout(id);
      },

      waitForCloseDelay: ({ props, send }) => {
        const id = setTimeout(
          () => send({ type: "after.closeDelay" }),
          resolvedProps(props).closeDelay,
        );
        return () => clearTimeout(id);
      },

      trackEscapeKey: ({ props, send }) => {
        if (!resolvedProps(props).closeOnEscape) return;
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
        const { id } = resolvedProps(props);
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

export interface TooltipApi {
  open: boolean;
  state: TooltipState;
  setOpen: (next: boolean) => void;
  trigger: { handlers: LogicalHandlers; attrs: LogicalAttrs };
  content: {
    handlers: LogicalHandlers;
    attrs: LogicalAttrs;
    positioning: PositioningOptions;
    rendered: boolean;
  };
}

export function connect(
  state: TooltipState,
  context: TooltipContext,
  props: TooltipProps,
  send: (event: { type: string; [key: string]: unknown }) => void,
): TooltipApi {
  const r = resolvedProps(props);
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
