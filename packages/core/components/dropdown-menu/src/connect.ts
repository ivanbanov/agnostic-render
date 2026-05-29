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
import { makeSelectEvent, PRINTABLE_KEY_RE } from "./utils";

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
          // preventDefault stops the browser from:
          //  - submitting an enclosing form on Enter
          //  - synthesizing a keyup-driven click on Space (which would
          //    re-toggle and close the menu we just opened)
          //  - scrolling the page on ArrowDown
          event.preventDefault?.();
          if (!open) send({ type: "trigger.key.open", items });
          break;
        case "ArrowUp":
          event.preventDefault?.();
          if (!open) send({ type: "trigger.key.open.last", items });
          break;
      }
    },
  };
  const triggerAttrs: AttrBindings = {
    id: triggerId,
    expanded: open,
    role: "button",
    "aria-haspopup": "menu",
    "aria-controls": open ? contentId : undefined,
    "data-state": open ? "open" : "closed",
  };

  const contentHandlers: EventBindings = {
    onKeyDown: (event) => {
      if (!event) return;
      const k = event.key;
      switch (k) {
        case "ArrowDown":
          event.preventDefault?.();
          send({ type: "arrow.down", items });
          break;
        case "ArrowUp":
          event.preventDefault?.();
          send({ type: "arrow.up", items });
          break;
        case "Home":
          event.preventDefault?.();
          send({ type: "home", items });
          break;
        case "End":
          event.preventDefault?.();
          send({ type: "end", items });
          break;
        case "Enter":
          event.preventDefault?.();
          send({ type: "enter", items });
          break;
        case " ":
          event.preventDefault?.();
          send({ type: "space", items });
          break;
        case "Escape":
          // Handled by trackEscapeKey effect; render layer just lets it bubble.
          break;
        case "Tab":
          if (r.focusTrap) {
            // Trapped: swallow Tab so focus can't leave the open menu.
            // The menu stays open; Esc or selecting an item exits.
            event.preventDefault?.();
            break;
          }
          // Loose (default): don't preventDefault — the browser's Tab
          // handling moves focus to the next focusable, which is exactly
          // what we want after closing.
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
    "data-state": open ? "open" : "closed",
    "data-orientation": "vertical",
    "data-side": placementToSide(r.positioning.placement),
  };

  const getItem = (item: DropdownMenuItemProps): DropdownMenuItemPart => {
    const highlighted = context.highlightedValue === item.value;
    const isToggleKind = item.kind === "checkbox" || item.kind === "radio";

    // data-state for toggle items reflects checked. For regular items
    // it tracks the parent menu's open/closed (the item is only ever
    // mounted while the menu is open, so it's always "open" here).
    let dataState: string;
    if (isToggleKind) {
      dataState =
        item.checked === true
          ? "checked"
          : item.checked === "indeterminate"
            ? "indeterminate"
            : "unchecked";
    } else {
      dataState = "open";
    }

    const itemAttrs: AttrBindings = {
      id: `dropdown-menu:${r.id}:item:${item.value}`,
      role:
        item.kind === "checkbox"
          ? "menuitemcheckbox"
          : item.kind === "radio"
            ? "menuitemradio"
            : "menuitem",
      disabled: item.disabled,
      selected: isToggleKind ? item.checked === true : highlighted,
      // Items are not tab stops — the content surface owns the single
      // tab stop and arrow-key navigation is roving (managed by the
      // machine via `highlightedValue`). Tab leaves the menu instead of
      // walking through items.
      focusable: false,
      "data-state": dataState,
      "data-orientation": "vertical",
      ...(highlighted ? { "data-highlighted": "" } : {}),
      ...(item.disabled ? { "data-disabled": "" } : {}),
    };

    return {
      highlighted,
      variants: {
        highlighted,
        disabled: !!item.disabled,
      },
      handlers: {
        onPress: () => {
          if (item.disabled) return;
          // Invoke onSelect synchronously here so the guard
          // shouldCloseOnSelect can read event.defaultPrevented before
          // deciding whether to close. The machine still receives
          // selectEvent so the guard has access to the same instance.
          const selectEvent = makeSelectEvent();
          item.onSelect?.(selectEvent);
          send({
            type: "item.click",
            value: item.value,
            onSelect: item.onSelect,
            selectEvent,
            closeOnSelect:
              item.closeOnSelect ?? (isToggleKind ? false : undefined),
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
      attrs: itemAttrs,
    };
  };

  return {
    open,
    focusTrap: r.focusTrap,
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
      // Resolve a pending trigger-key open intent now that items are known.
      // The machine sets `pendingHighlight` on `trigger.key.open[.last]`,
      // then the render layer hands the items list through withItems —
      // this fires `items.ready` to apply the highlight.
      if (open && context.pendingHighlight && nextItems.length > 0) {
        send({ type: "items.ready", items: nextItems });
      }
      return connectDropdownMenu({ state, context, props, send })(nextItems);
    },
  };
});
