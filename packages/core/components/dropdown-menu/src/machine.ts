/**
 * DropdownMenu machine — substrate-agnostic state machine.
 *
 * States: idle → open → idle
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

import type { MachineConfig } from "@render-experiment/machine-core";
import { dropdownMenuProps, TYPEAHEAD_RESET_MS } from "./props";
import { dropdownMenuStore } from "./store";
import type {
  DropdownMenuContext,
  DropdownMenuProps,
} from "./types";
import {
  firstEnabled,
  lastEnabled,
  makeSelectEvent,
  readItems,
  step,
  typeaheadFind,
} from "./utils";

export const dropdownMenuMachine: MachineConfig<
  DropdownMenuContext,
  DropdownMenuProps
> = {
  initial: (props) => {
    const r = dropdownMenuProps(props);
    return r.open ?? r.defaultOpen ? "open" : "idle";
  },

  context: (props) => ({
    highlightedValue: null,
    suspendPointer: false,
    currentPlacement: dropdownMenuProps(props).positioning.placement,
    typeaheadBuffer: "",
    typeaheadLastTime: 0,
    pendingHighlight: null,
  }),

  states: {
    idle: {
      entry: ["clearGlobalId", "clearHighlight", "clearPendingHighlight"],
      on: {
        "trigger.click": {
          target: "open",
          actions: ["invokeOnOpen", "setGlobalId"],
        },
        "trigger.key.open": {
          target: "open",
          actions: ["invokeOnOpen", "setGlobalId", "setPendingFirst"],
        },
        "trigger.key.open.last": {
          target: "open",
          actions: ["invokeOnOpen", "setGlobalId", "setPendingLast"],
        },
        open: {
          target: "open",
          actions: ["invokeOnOpen", "setGlobalId"],
        },
      },
    },

    open: {
      effects: ["trackEscapeKey", "trackGlobalStore"],
      on: {
        close: { target: "idle", actions: ["invokeOnClose"] },
        "trigger.click": { target: "idle", actions: ["invokeOnClose"] },
        escape: { target: "idle", actions: ["invokeOnClose"] },

        "item.pointermove": { actions: ["highlightItem"] },
        "item.pointerleave": { actions: ["clearHighlightIfMatch"] },
        "item.click": [
          {
            guard: "shouldCloseOnSelect",
            target: "idle",
            // onSelect was already invoked synchronously at the connect's
            // call site so the guard could read event.defaultPrevented.
            actions: ["invokeOnClose"],
          },
          {},
        ],

        "arrow.down": { actions: ["suspendPointer", "highlightNext"] },
        "arrow.up": { actions: ["suspendPointer", "highlightPrev"] },
        home: { actions: ["suspendPointer", "highlightFirst"] },
        end: { actions: ["suspendPointer", "highlightLast"] },

        enter: { actions: ["clickHighlightedItem"] },
        space: { actions: ["clickHighlightedItem"] },

        "typeahead.char": { actions: ["typeaheadMatch"] },

        "pointer.resume": { actions: ["resumePointer"] },

        "items.ready": { actions: ["applyPendingHighlight"] },
      },
    },
  },

  implementations: {
    guards: {
      shouldCloseOnSelect: ({ props, event }) => {
        // Consumer can cancel close via onSelect(event).preventDefault().
        const selectEvent = event.selectEvent as
          | { defaultPrevented?: boolean }
          | undefined;
        if (selectEvent?.defaultPrevented) return false;
        // Per-item override (false for checkbox/radio); otherwise resolved prop.
        const itemCloseOnSelect = event.closeOnSelect as boolean | undefined;
        if (itemCloseOnSelect === false) return false;
        if (itemCloseOnSelect === true) return true;
        return dropdownMenuProps(props).closeOnSelect;
      },
    },

    actions: {
      invokeOnOpen: ({ props }) => {
        dropdownMenuProps(props).onOpenChange?.({ open: true });
      },
      invokeOnClose: ({ props }) => {
        dropdownMenuProps(props).onOpenChange?.({ open: false });
      },
      setGlobalId: ({ props }) => {
        dropdownMenuStore.setOpen(dropdownMenuProps(props).id);
      },
      clearGlobalId: ({ props }) => {
        const { id } = dropdownMenuProps(props);
        if (dropdownMenuStore.get().openId === id) {
          dropdownMenuStore.setOpen(null);
        }
      },

      clearHighlight: ({ setContext }) => {
        setContext({ highlightedValue: null });
      },
      highlightItem: ({ context, setContext, event }) => {
        if (context.suspendPointer) return;
        const value = event.value as string | undefined;
        if (typeof value !== "string") return;
        setContext({ highlightedValue: value });
      },
      clearHighlightIfMatch: ({ context, setContext, event }) => {
        if (context.suspendPointer) return;
        const value = event.value as string | undefined;
        if (typeof value === "string" && context.highlightedValue === value) {
          setContext({ highlightedValue: null });
        }
      },
      suspendPointer: ({ setContext }) => {
        setContext({ suspendPointer: true });
      },
      resumePointer: ({ setContext }) => {
        setContext({ suspendPointer: false });
      },

      setPendingFirst: ({ setContext }) => {
        setContext({ pendingHighlight: "first" });
      },
      setPendingLast: ({ setContext }) => {
        setContext({ pendingHighlight: "last" });
      },
      clearPendingHighlight: ({ setContext }) => {
        setContext({ pendingHighlight: null });
      },
      applyPendingHighlight: ({ context, setContext, event }) => {
        if (!context.pendingHighlight) return;
        const items = readItems(event);
        const next =
          context.pendingHighlight === "first"
            ? firstEnabled(items)
            : lastEnabled(items);
        if (next) {
          setContext({
            highlightedValue: next.value,
            pendingHighlight: null,
          });
        }
      },

      highlightFirst: ({ setContext, event }) => {
        const items = readItems(event);
        const next = firstEnabled(items);
        if (next) setContext({ highlightedValue: next.value });
      },
      highlightLast: ({ setContext, event }) => {
        const items = readItems(event);
        const next = lastEnabled(items);
        if (next) setContext({ highlightedValue: next.value });
      },
      highlightNext: ({ context, setContext, props, event }) => {
        const items = readItems(event);
        const next = step(
          items,
          context.highlightedValue,
          1,
          dropdownMenuProps(props).loop,
        );
        if (next) setContext({ highlightedValue: next.value });
      },
      highlightPrev: ({ context, setContext, props, event }) => {
        const items = readItems(event);
        const next = step(
          items,
          context.highlightedValue,
          -1,
          dropdownMenuProps(props).loop,
        );
        if (next) setContext({ highlightedValue: next.value });
      },

      clickHighlightedItem: ({ context, send, event }) => {
        const items = readItems(event);
        const current = items.find((i) => i.value === context.highlightedValue);
        if (!current || current.disabled) return;
        // Invoke onSelect synchronously so the guard can read
        // event.defaultPrevented — matches the pointer-click path in
        // connect.ts.
        const selectEvent = makeSelectEvent();
        current.onSelect?.(selectEvent);
        send({
          type: "item.click",
          value: current.value,
          onSelect: current.onSelect,
          selectEvent,
          // explicit per-item override; falls through to default behavior
          // when undefined (regular items close, toggles don't)
          closeOnSelect:
            current.closeOnSelect ??
            (current.kind === "checkbox" || current.kind === "radio"
              ? false
              : undefined),
          items,
        });
      },

      typeaheadMatch: ({ context, setContext, event }) => {
        const items = readItems(event);
        const char = (event.char as string | undefined)?.toLowerCase();
        if (!char) return;

        const now = Date.now();
        const expired = now - context.typeaheadLastTime > TYPEAHEAD_RESET_MS;
        const buffer = expired ? char : context.typeaheadBuffer + char;

        const match = typeaheadFind(items, buffer, context.highlightedValue);
        if (match) {
          setContext({
            typeaheadBuffer: buffer,
            typeaheadLastTime: now,
            highlightedValue: match.value,
            suspendPointer: true,
          });
        } else {
          setContext({ typeaheadBuffer: buffer, typeaheadLastTime: now });
        }
      },
    },

    effects: {
      // Substrate-specific: each adapter overrides via withAdapter().
      trackEscapeKey: () => undefined,

      trackGlobalStore: ({ props, send }) => {
        const { id } = dropdownMenuProps(props);
        return dropdownMenuStore.subscribe(() => {
          const openId = dropdownMenuStore.get().openId;
          if (openId !== id && openId !== null) {
            send({ type: "close", src: "store.id.change" });
          }
        });
      },
    },
  },
};
