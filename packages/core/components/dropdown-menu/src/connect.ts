/**
 * DropdownMenu connect — translates machine state into a logical surface
 * the view layer consumes.
 *
 * Sibling files:
 *   - machine.ts  — the state machine config
 *   - types.ts    — DropdownMenuApi (the return type)
 *   - props.ts    — resolver for raw props
 *   - utils.ts    — PRINTABLE_KEY_RE and item helpers
 */

import {
  connector,
  type AttrBindings,
  type EventBindings,
} from "@render-experiment/machine-core";
import { placementToSide } from "@render-experiment/utils";
import { dropdownMenuProps } from "./props";
import type {
  DropdownMenuApi,
  DropdownMenuContext,
  DropdownMenuProps,
  DropdownMenuState,
  DropdownMenuItemPart,
  DropdownMenuItemProps,
} from "./types";
import { PRINTABLE_KEY_RE } from "./utils";

export const connectDropdownMenu = connector<
  DropdownMenuState,
  DropdownMenuContext,
  DropdownMenuProps,
  DropdownMenuApi
>()(({ state, context, props, send }, items: DropdownMenuItemProps[] = []): DropdownMenuApi => {
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

  const getItem = (item: DropdownMenuItemProps): DropdownMenuItemPart => {
    const highlighted = context.highlightedValue === item.value;
    const isToggleKind = item.kind === "checkbox" || item.kind === "radio";
    return {
      highlighted,
      variants: {
        highlighted,
        disabled: !!item.disabled,
      },
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
    setOpen(next) {
      if (open === next) return;
      send({ type: next ? "open" : "close" });
    },

    parts: {
      trigger: { handlers: triggerHandlers, attrs: triggerAttrs },
      content: {
        handlers: contentHandlers,
        attrs: contentAttrs,
        variants: {
          side: placementToSide(r.positioning.placement),
        },
        positioning: r.positioning,
        rendered: open,
      },
      separator: { attrs: { role: "separator" } },
      label: { attrs: { role: "presentation" } },
      group: { attrs: { role: "group" } },
    },

    getItem,

    withItems(nextItems) {
      return connectDropdownMenu({ state, context, props, send })(nextItems);
    },
  };
});
