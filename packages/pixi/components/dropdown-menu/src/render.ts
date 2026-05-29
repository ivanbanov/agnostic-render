/**
 * Imperative Pixi DropdownMenu — no JSX, no provider, no hooks.
 *
 *   const menu = createDropdownMenu({
 *     trigger: button,
 *     parent: overlayLayer,
 *     items: [
 *       { value: "open", label: "Open" },
 *       { value: "save", label: "Save", onSelect: () => save() },
 *       { kind: "separator" },
 *       { value: "show-grid", label: "Show grid", kind: "checkbox", checked: false },
 *     ],
 *     onOpenChange: ({ open }) => ...,
 *   });
 *   menu.destroy();
 *
 * Differences vs React:
 *   - Items are an upfront data array, not children + a registry.
 *   - Keyboard (Arrow / Enter / Home / End / typeahead) is window-level and
 *     dispatched to api.parts.trigger.handlers.onKeyDown / api.parts.content.handlers.onKeyDown
 *     directly (Pixi has no per-node key events).
 *   - Outside-pointerdown to close lives in the render layer (stage events).
 */

import type { Container } from "pixi.js";
import { normalize, type PixiListenerPair } from "@render-experiment/machine-pixi";
import type {
  DropdownMenuApi,
  DropdownMenuProps,
  DropdownMenuItemProps,
} from "@render-experiment/dropdown-menu-core";
import type { StyledNode } from "@render-experiment/style-engine-pixi";
import { createDropdownMenuBridge } from "./generated/api";
import * as Styled from "./generated/elements";
import { anchorOf, boundsToRect, edgePinOffset } from "./utils";

// -----------------------------------------------------------------------------
// Item config — superset of DropdownMenuItemProps with display label + separator entry.
// -----------------------------------------------------------------------------

export type DropdownMenuItemConfig =
  | (DropdownMenuItemProps & { label: string })
  | { kind: "separator" }
  | { kind: "label"; label: string };

export interface CreateDropdownMenuOptions extends Omit<DropdownMenuProps, "id"> {
  trigger: Container;
  parent: Container;
  items: DropdownMenuItemConfig[];
  id?: string;
}

export interface DropdownMenuHandle {
  setOpen: (next: boolean) => void;
  /** Replace the items list (re-renders the menu body if open). */
  setItems: (items: DropdownMenuItemConfig[]) => void;
  destroy: () => void;
}

let idCounter = 0;
const nextId = () => `pixi-dropdown-menu-${++idCounter}`;

function isItem(
  entry: DropdownMenuItemConfig,
): entry is DropdownMenuItemProps & { label: string } {
  return !("kind" in entry) || (entry.kind !== "separator" && entry.kind !== "label");
}

export function createDropdownMenu(
  options: CreateDropdownMenuOptions,
): DropdownMenuHandle {
  const { trigger, parent, items: initialItems, id: providedId, ...rest } = options;
  const id = providedId ?? nextId();

  const bridge = createDropdownMenuBridge({ id, ...rest });
  const { runtime } = bridge;

  trigger.eventMode = "static";

  const positionerNode = Styled.Positioner();
  const contentNode = Styled.Content();
  positionerNode.root.addChild(contentNode.root);

  // -------------------------------------------------------------------
  // Item nodes — recreated on setItems(). Always rebuilt when items
  // change; cheaper than diffing for our v1 scope.
  // -------------------------------------------------------------------

  let itemConfigs: DropdownMenuItemConfig[] = initialItems;
  let itemNodes: Array<StyledNode | null> = []; // null entries for separator/label

  const disposeItemNodes = () => {
    for (const node of itemNodes) node?.dispose();
    itemNodes = [];
  };

  const buildItemNodes = () => {
    disposeItemNodes();
    let cursorY = 0;
    const innerWidth = 200; // matches content minWidth from spec, approx
    for (const entry of itemConfigs) {
      if ("kind" in entry && entry.kind === "separator") {
        const sep = Styled.Separator();
        sep.setSize(innerWidth, 1);
        sep.root.x = 0;
        sep.root.y = cursorY + 4;
        cursorY += 9;
        contentNode.root.addChild(sep.root);
        itemNodes.push(sep);
        continue;
      }
      if ("kind" in entry && entry.kind === "label") {
        const label = Styled.Label();
        label.setLabel(entry.label);
        label.root.x = 0;
        label.root.y = cursorY;
        cursorY += 22;
        contentNode.root.addChild(label.root);
        itemNodes.push(label);
        continue;
      }
      // Real menu item — interactive.
      const node = Styled.Item();
      const prefix =
        entry.kind === "checkbox" && entry.checked ? "✓ " : "";
      node.setLabel(prefix + entry.label);
      node.setSize(innerWidth, 28);
      node.root.x = 0;
      node.root.y = cursorY;
      node.root.eventMode = "static";
      cursorY += 28;
      contentNode.root.addChild(node.root);
      itemNodes.push(node);
    }
  };

  buildItemNodes();

  // -------------------------------------------------------------------
  // Mount/unmount the overlay.
  // -------------------------------------------------------------------

  let mounted = false;
  const mount = () => {
    if (mounted) return;
    parent.addChild(positionerNode.root);
    mounted = true;
  };
  const unmount = () => {
    if (!mounted) return;
    parent.removeChild(positionerNode.root);
    mounted = false;
  };

  // -------------------------------------------------------------------
  // Listener attachment helpers — re-bound every tick because the api's
  // handler closures capture the latest items array + send.
  // -------------------------------------------------------------------

  let triggerPairs: PixiListenerPair[] = [];
  const detachTrigger = () => {
    for (const { event, listener } of triggerPairs) {
      trigger.off(event as never, listener as never);
    }
    triggerPairs = [];
  };
  const attachTrigger = (api: DropdownMenuApi) => {
    detachTrigger();
    const pairs = normalize(api.parts.trigger.handlers as unknown as Record<string, unknown>);
    for (const { event, listener } of pairs) {
      trigger.on(event as never, listener as never);
    }
    triggerPairs = pairs;
  };

  // Per-item listeners — array parallel to itemNodes (with empty arrays for
  // separators / labels).
  let itemPairs: PixiListenerPair[][] = [];
  const detachItems = () => {
    for (let i = 0; i < itemPairs.length; i++) {
      const node = itemNodes[i];
      const pairs = itemPairs[i];
      if (!node || !pairs) continue;
      for (const { event, listener } of pairs) {
        node.root.off(event as never, listener as never);
      }
    }
    itemPairs = [];
  };
  const attachItems = (api: DropdownMenuApi) => {
    detachItems();
    itemPairs = itemConfigs.map((entry, i) => {
      const node = itemNodes[i];
      if (!node || !isItem(entry)) return [];
      const part = api.getItem(entry);
      const pairs = normalize(part.handlers as unknown as Record<string, unknown>);
      for (const { event, listener } of pairs) {
        node.root.on(event as never, listener as never);
      }
      node.apply(part.variants);
      return pairs;
    });
  };

  // -------------------------------------------------------------------
  // Window-level keydown — Pixi normalize() drops onKeyDown. We bind to
  // window while open and forward to the connect's onKeyDown handlers
  // directly.
  // -------------------------------------------------------------------

  let removeKeyListener: (() => void) | null = null;
  const attachKeyListener = () => {
    if (removeKeyListener) return; // already on
    const onKey = (event: KeyboardEvent) => {
      // While open, content has focus conceptually — route there. While
      // closed, trigger handles ArrowDown/Enter/Space to open.
      const latest = bridge.getApi().withItems(currentItemProps());
      const handler = (
        latest.open ? latest.parts.content.handlers : latest.parts.trigger.handlers
      ).onKeyDown as ((e: KeyboardEvent) => void) | undefined;
      handler?.(event);
    };
    window.addEventListener("keydown", onKey);
    removeKeyListener = () => window.removeEventListener("keydown", onKey);
  };
  const detachKeyListener = () => {
    removeKeyListener?.();
    removeKeyListener = null;
  };

  // -------------------------------------------------------------------
  // Outside-pointerdown — close menu when user clicks outside both the
  // trigger and the content. Listens at window level (pointerdown is a
  // standard DOM event on the canvas's container).
  // -------------------------------------------------------------------

  let removeOutsideListener: (() => void) | null = null;
  const attachOutsideListener = () => {
    if (removeOutsideListener) return;
    const onPointerDown = (event: PointerEvent) => {
      // Convert window coords to stage space using trigger's parent chain.
      // Cheapest check: ask Pixi which display object is at the global
      // point via hit-testing the stage tree. To avoid pulling the
      // Application here, we instead check bounds directly.
      const triggerBounds = trigger.getBounds();
      const inTrigger =
        event.clientX >= triggerBounds.x &&
        event.clientX <= triggerBounds.x + triggerBounds.width &&
        event.clientY >= triggerBounds.y &&
        event.clientY <= triggerBounds.y + triggerBounds.height;
      if (inTrigger) return;

      const contentBounds = contentNode.root.getBounds();
      const inContent =
        event.clientX >= contentBounds.x &&
        event.clientX <= contentBounds.x + contentBounds.width &&
        event.clientY >= contentBounds.y &&
        event.clientY <= contentBounds.y + contentBounds.height;
      if (inContent) return;

      bridge.getApi().setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    removeOutsideListener = () =>
      window.removeEventListener("pointerdown", onPointerDown);
  };
  const detachOutsideListener = () => {
    removeOutsideListener?.();
    removeOutsideListener = null;
  };

  // -------------------------------------------------------------------
  // Position the overlay once per tick when open.
  // -------------------------------------------------------------------

  const positionOverlay = (api: DropdownMenuApi) => {
    const rect = boundsToRect(trigger.getBounds());
    const anchor = anchorOf(rect, api.parts.content.positioning);
    positionerNode.root.x = anchor.x;
    positionerNode.root.y = anchor.y;

    const { side } = api.parts.content.variants;
    const align = (api.parts.content.positioning.placement.split("-")[1] ?? undefined) as
      | "start"
      | "end"
      | undefined;

    const w = contentNode.root.width;
    const h = contentNode.root.height;
    const offset = edgePinOffset(side, align, w, h);
    contentNode.root.x = offset.x;
    contentNode.root.y = offset.y;

    contentNode.apply(api.parts.content.variants);
    positionerNode.apply({ anchored: true });
  };

  // -------------------------------------------------------------------
  // Items extraction: just the DropdownMenuItemProps part of itemConfigs, in
  // visual order. The machine uses this list for keyboard nav + typeahead.
  // -------------------------------------------------------------------

  const currentItemProps = (): DropdownMenuItemProps[] =>
    itemConfigs.filter(isItem) as DropdownMenuItemProps[];

  // -------------------------------------------------------------------
  // Sync — pull latest api, re-attach handlers, mount/unmount, position.
  // -------------------------------------------------------------------

  const sync = () => {
    const api = bridge.getApi().withItems(currentItemProps());
    attachTrigger(api);

    if (api.parts.content.rendered) {
      mount();
      attachItems(api);
      attachKeyListener();
      attachOutsideListener();
      positionOverlay(api);
    } else {
      detachItems();
      detachKeyListener();
      detachOutsideListener();
      unmount();
    }
  };

  sync();
  const unsubscribe = runtime.subscribe(sync);

  return {
    setOpen: (next) => bridge.getApi().setOpen(next),
    setItems: (next) => {
      itemConfigs = next;
      buildItemNodes();
      sync();
    },
    destroy: () => {
      unsubscribe();
      detachTrigger();
      detachItems();
      detachKeyListener();
      detachOutsideListener();
      unmount();
      disposeItemNodes();
      contentNode.dispose();
      positionerNode.dispose();
      runtime.dispose();
    },
  };
}
