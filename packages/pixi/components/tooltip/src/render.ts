/**
 * Imperative Pixi Tooltip — no JSX, no provider, no hooks.
 *
 *   const tooltip = createTooltip({
 *     trigger: button,            // any Pixi Container (the hover target)
 *     content: "Save",            // string OR a Container the caller built
 *     parent: overlayLayer,       // Container that hosts the floating tooltip
 *     openDelay: 400,
 *     onOpenChange: ({ open }) => ...,
 *   });
 *   tooltip.destroy();
 *
 * Mechanics:
 *   - Hover events are read off the trigger via Pixi federated events.
 *   - On open, a Positioner Container is addChilded to `parent` at the
 *     anchor point computed from trigger.getBounds() + the machine's
 *     positioning. The Content node sits inside the Positioner with an
 *     edge-pin offset so it hangs off the anchor (mirror of the
 *     `top/right/bottom/left: 100%` trick on the web side).
 *   - On close, the Positioner is removed (kept around for next open).
 *   - Re-derivation is driven by subscribing to the runtime version
 *     counter — same pattern useMachine uses, just imperative.
 */

import type { Container } from "pixi.js";
import { normalize, type PixiListenerPair } from "@render-experiment/machine-pixi";
import type { TooltipApi, TooltipProps } from "@render-experiment/tooltip-core";
import { createTooltipBridge } from "./generated/api";
import * as Styled from "./generated/elements";
import { anchorOf, boundsToRect, edgePinOffset } from "./utils";

export interface CreateTooltipOptions extends Omit<TooltipProps, "id"> {
  /** Pixi node the user hovers / interacts with. */
  trigger: Container;
  /** Container that hosts the floating overlay (typically a top UI layer). */
  parent: Container;
  /**
   * Tooltip body. A string becomes the label of the generated Content node;
   * a Container is used as-is (the caller controls its layout).
   */
  content: string | Container;
  /** Optional explicit id — auto-generated if omitted. */
  id?: string;
}

export interface TooltipHandle {
  /** Force-set the open state (controlled toggle). */
  setOpen: (next: boolean) => void;
  /** Tear down: detach listeners, remove overlay nodes, stop the machine. */
  destroy: () => void;
}

let idCounter = 0;
const nextId = () => `pixi-tooltip-${++idCounter}`;

export function createTooltip(options: CreateTooltipOptions): TooltipHandle {
  const { trigger, parent, content, id: providedId, ...rest } = options;
  const id = providedId ?? nextId();

  const bridge = createTooltipBridge({ id, ...rest });
  const { runtime } = bridge;

  // Trigger must be interactive for Pixi to emit pointer events.
  trigger.eventMode = "static";

  // The Positioner + Content nodes are owned by us; (re)used across opens.
  const positionerNode = Styled.Positioner();
  const isStringContent = typeof content === "string";
  const contentNode = isStringContent
    ? Styled.Content({ red: rest.red ? "true" : "false" })
    : null;
  if (contentNode) contentNode.setLabel(content as string);
  const contentRoot: Container = contentNode ? contentNode.root : (content as Container);

  positionerNode.root.addChild(contentRoot);

  // Track attached state so subscribe() is idempotent across redundant ticks.
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

  // -----------------------------------------------------------------------
  // Trigger listeners — re-bound on every api change because the connect's
  // handler closures capture the latest props / send.
  // -----------------------------------------------------------------------

  let attachedPairs: PixiListenerPair[] = [];
  const detachTriggerListeners = () => {
    for (const { event, listener } of attachedPairs) {
      trigger.off(event as never, listener as never);
    }
    attachedPairs = [];
  };
  const attachTriggerListeners = (api: TooltipApi) => {
    detachTriggerListeners();
    const pairs = normalize(api.parts.trigger.handlers as unknown as Record<string, unknown>);
    for (const { event, listener } of pairs) {
      trigger.on(event as never, listener as never);
    }
    attachedPairs = pairs;
  };

  // Same idea for content handlers (interactive: true tooltips need to
  // know when the pointer enters/leaves the floating body).
  let attachedContentPairs: PixiListenerPair[] = [];
  const detachContentListeners = () => {
    for (const { event, listener } of attachedContentPairs) {
      contentRoot.off(event as never, listener as never);
    }
    attachedContentPairs = [];
  };
  const attachContentListeners = (api: TooltipApi) => {
    detachContentListeners();
    const pairs = normalize(api.parts.content.handlers as unknown as Record<string, unknown>);
    if (pairs.length === 0) return;
    contentRoot.eventMode = "static";
    for (const { event, listener } of pairs) {
      contentRoot.on(event as never, listener as never);
    }
    attachedContentPairs = pairs;
  };

  // -----------------------------------------------------------------------
  // Position computation — runs on every render tick when open.
  // -----------------------------------------------------------------------

  const positionOverlay = (api: TooltipApi) => {
    const bounds = trigger.getBounds();
    const rect = boundsToRect(bounds);
    const anchor = anchorOf(rect, api.parts.content.positioning);
    positionerNode.root.x = anchor.x;
    positionerNode.root.y = anchor.y;

    const { side, red } = api.parts.content.variants;
    const align = (api.parts.content.positioning.placement.split("-")[1] ?? undefined) as
      | "start"
      | "end"
      | undefined;

    // The styled Content auto-sizes from its label + padding. Read its
    // current width/height after styling and edge-pin it relative to the
    // anchor (== positioner origin).
    const w = contentRoot.width;
    const h = contentRoot.height;
    const offset = edgePinOffset(side, align, w, h);
    contentRoot.x = offset.x;
    contentRoot.y = offset.y;

    // Apply variants if we own the styled content (string-content mode).
    if (contentNode) {
      contentNode.apply({ side, red });
    }
    positionerNode.apply({ anchored: "true" });
  };

  // -----------------------------------------------------------------------
  // Subscribe to the runtime; re-derive api on every tick.
  // -----------------------------------------------------------------------

  const sync = () => {
    const api = bridge.getApi();
    attachTriggerListeners(api);

    if (api.parts.content.rendered) {
      mount();
      attachContentListeners(api);
      positionOverlay(api);
    } else {
      detachContentListeners();
      unmount();
    }
  };

  // Initial wire-up
  sync();
  const unsubscribe = runtime.subscribe(sync);

  return {
    setOpen: (next) => bridge.getApi().setOpen(next),
    destroy: () => {
      unsubscribe();
      detachTriggerListeners();
      detachContentListeners();
      unmount();
      positionerNode.dispose();
      if (contentNode) contentNode.dispose();
      runtime.dispose();
    },
  };
}
