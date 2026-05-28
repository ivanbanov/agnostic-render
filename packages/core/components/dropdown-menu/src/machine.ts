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
 *   - types.ts   — public types
 *   - props.ts   — defaults + resolver
 *   - styles.ts  — paint-only style specs per element
 *   - index.ts   — public exports
 */

import {
  createStore,
  type MachineConfig,
} from "@render-experiment/machine-core";
import {
  dropdownMenuProps,
  TYPEAHEAD_RESET_MS,
} from "./props";
import type {
  AttrBindings,
  EventBindings,
} from "@render-experiment/machine-core";
import type {
  DropdownMenuApi,
  DropdownMenuContext,
  DropdownMenuProps,
  DropdownMenuState,
  MenuItemPart,
  MenuItemProps,
} from "./types";

// -----------------------------------------------------------------------------
// Global "only one menu open at a time" store
// -----------------------------------------------------------------------------

interface MenuStoreState {
  openId: string | null;
}

const store = createStore<MenuStoreState>({ openId: null });

export const dropdownMenuStore = {
  get: store.get,
  subscribe: store.subscribe,
  setOpen(id: string | null) {
    store.set((s) => ({ ...s, openId: id }));
  },
};

// -----------------------------------------------------------------------------
// Machine config
// -----------------------------------------------------------------------------

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
  }),

  states: {
    idle: {
      entry: ["clearGlobalId", "clearHighlight"],
      on: {
        "trigger.click": {
          target: "open",
          actions: ["invokeOnOpen", "setGlobalId"],
        },
        "trigger.key.open": {
          target: "open",
          actions: ["invokeOnOpen", "setGlobalId", "highlightFirst"],
        },
        "trigger.key.open.last": {
          target: "open",
          actions: ["invokeOnOpen", "setGlobalId", "highlightLast"],
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
            actions: ["invokeOnSelect", "invokeOnClose"],
          },
          { actions: ["invokeOnSelect"] },
        ],

        "arrow.down": { actions: ["suspendPointer", "highlightNext"] },
        "arrow.up": { actions: ["suspendPointer", "highlightPrev"] },
        home: { actions: ["suspendPointer", "highlightFirst"] },
        end: { actions: ["suspendPointer", "highlightLast"] },

        enter: { actions: ["clickHighlightedItem"] },
        space: { actions: ["clickHighlightedItem"] },

        "typeahead.char": { actions: ["typeaheadMatch"] },

        "pointer.resume": { actions: ["resumePointer"] },
      },
    },
  },

  implementations: {
    guards: {
      shouldCloseOnSelect: ({ props, event }) => {
        // Per-item override (false for checkbox/radio); otherwise resolved prop.
        const itemCloseOnSelect = event.closeOnSelect as boolean | undefined;
        if (itemCloseOnSelect === false) return false;
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
      invokeOnSelect: ({ event }) => {
        const onSelect = event.onSelect as (() => void) | undefined;
        onSelect?.();
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
        send({
          type: "item.click",
          value: current.value,
          onSelect: current.onSelect,
          // checkbox/radio always keep open
          closeOnSelect:
            current.kind === "checkbox" || current.kind === "radio"
              ? false
              : undefined,
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

// -----------------------------------------------------------------------------
// Item walker helpers
// -----------------------------------------------------------------------------

function readItems(event: unknown): MenuItemProps[] {
  const items = (event as { items?: unknown } | undefined)?.items;
  if (!Array.isArray(items)) return [];
  return items as MenuItemProps[];
}

function firstEnabled(items: MenuItemProps[]): MenuItemProps | undefined {
  return items.find((i) => !i.disabled);
}

function lastEnabled(items: MenuItemProps[]): MenuItemProps | undefined {
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i]!.disabled) return items[i];
  }
  return undefined;
}

function step(
  items: MenuItemProps[],
  current: string | null,
  direction: 1 | -1,
  loop: boolean,
): MenuItemProps | undefined {
  if (items.length === 0) return undefined;
  if (current == null) {
    return direction === 1 ? firstEnabled(items) : lastEnabled(items);
  }
  const idx = items.findIndex((i) => i.value === current);
  if (idx === -1) return firstEnabled(items);
  let next = idx + direction;
  while (next >= 0 && next < items.length) {
    if (!items[next]!.disabled) return items[next];
    next += direction;
  }
  if (!loop) return undefined;
  return direction === 1 ? firstEnabled(items) : lastEnabled(items);
}

function typeaheadFind(
  items: MenuItemProps[],
  buffer: string,
  current: string | null,
): MenuItemProps | undefined {
  if (!buffer) return undefined;
  const lcBuffer = buffer.toLowerCase();
  const enabled = items.filter((i) => !i.disabled);
  const startsWith = (item: MenuItemProps) =>
    (item.textValue ?? item.value).toLowerCase().startsWith(lcBuffer);

  // Single-char advance from current: cycle past current to the next match.
  if (buffer.length === 1 && current) {
    const currentIdx = enabled.findIndex((i) => i.value === current);
    if (currentIdx >= 0) {
      const after = enabled.slice(currentIdx + 1).find(startsWith);
      if (after) return after;
    }
  }
  return enabled.find(startsWith);
}

// -----------------------------------------------------------------------------
// connect — produces a LOGICAL surface, not DOM props
// -----------------------------------------------------------------------------

const PRINTABLE_KEY_RE = /^[\p{L}\p{N}\p{P}\p{S} ]$/u;

export function connect(
  state: DropdownMenuState,
  context: DropdownMenuContext,
  props: DropdownMenuProps,
  send: (event: { type: string; [key: string]: unknown }) => void,
): DropdownMenuApi {
  return makeApi(state, context, props, send, []);
}

function makeApi(
  state: DropdownMenuState,
  context: DropdownMenuContext,
  props: DropdownMenuProps,
  send: (event: { type: string; [key: string]: unknown }) => void,
  items: MenuItemProps[],
): DropdownMenuApi {
  const r = dropdownMenuProps(props);
  const open = state === "open";

  const triggerId = `dropdown-menu:${r.id}:trigger`;
  const contentId = `dropdown-menu:${r.id}:content`;

  const triggerHandlers: EventBindings = {
    onPress: () => send({ type: "trigger.click", items }),
    onKeyDown: (event) => {
      if (!event) return;
      switch (event.key) {
        case "ArrowDown":
        case "Enter":
        case " ":
          if (!open) send({ type: "trigger.key.open", items });
          break;
        case "ArrowUp":
          if (!open) send({ type: "trigger.key.open.last", items });
          break;
      }
    },
  };
  const triggerAttrs: AttrBindings = {
    id: triggerId,
    expanded: open,
    role: "button",
  };

  const contentHandlers: EventBindings = {
    onKeyDown: (event) => {
      if (!event) return;
      const k = event.key;
      switch (k) {
        case "ArrowDown":
          send({ type: "arrow.down", items });
          break;
        case "ArrowUp":
          send({ type: "arrow.up", items });
          break;
        case "Home":
          send({ type: "home", items });
          break;
        case "End":
          send({ type: "end", items });
          break;
        case "Enter":
          send({ type: "enter", items });
          break;
        case " ":
          send({ type: "space", items });
          break;
        case "Escape":
          // Handled by trackEscapeKey effect; render layer just lets it bubble.
          break;
        case "Tab":
          send({ type: "close" });
          break;
        default:
          if (
            r.typeahead &&
            typeof k === "string" &&
            k.length === 1 &&
            PRINTABLE_KEY_RE.test(k)
          ) {
            send({ type: "typeahead.char", char: k, items });
          }
      }
    },
    // Re-enable pointer-driven highlight on pointer movement, undoing the
    // suspendPointer flag from keyboard nav.
    onPointerMove: () => {
      if (context.suspendPointer) send({ type: "pointer.resume" });
    },
  };
  const contentAttrs: AttrBindings = {
    id: contentId,
    role: "menu",
    focusable: true,
    labelledBy: triggerId,
  };

  const getItem = (item: MenuItemProps): MenuItemPart => {
    const highlighted = context.highlightedValue === item.value;
    const isToggleKind = item.kind === "checkbox" || item.kind === "radio";
    return {
      highlighted,
      handlers: {
        onPress: () => {
          if (item.disabled) return;
          send({
            type: "item.click",
            value: item.value,
            onSelect: item.onSelect,
            closeOnSelect: isToggleKind ? false : undefined,
            items,
          });
        },
        onPointerMove: () => {
          if (item.disabled) return;
          send({ type: "item.pointermove", value: item.value, items });
        },
        onPointerLeave: () => {
          send({ type: "item.pointerleave", value: item.value, items });
        },
      },
      attrs: {
        id: `dropdown-menu:${r.id}:item:${item.value}`,
        role:
          item.kind === "checkbox"
            ? "menuitemcheckbox"
            : item.kind === "radio"
              ? "menuitemradio"
              : "menuitem",
        disabled: item.disabled,
        // `selected` reflects highlight for regular items; for checkbox/radio
        // it's the persisted check state.
        selected: isToggleKind ? item.checked === true : highlighted,
        focusable: !item.disabled,
      },
    };
  };

  return {
    open,
    state,
    setOpen(next) {
      if (open === next) return;
      send({ type: next ? "open" : "close" });
    },

    trigger: { handlers: triggerHandlers, attrs: triggerAttrs },
    content: {
      handlers: contentHandlers,
      attrs: contentAttrs,
      positioning: r.positioning,
      rendered: open,
    },
    getItem,
    separator: { attrs: { role: "separator" } },
    label: { attrs: { role: "presentation" } },
    group: { attrs: { role: "group" } },

    withItems(nextItems) {
      return makeApi(state, context, props, send, nextItems);
    },
  };
}
