/**
 * Tooltip connect — translates machine state into a logical surface
 * the view layer consumes.
 *
 * Output is substrate-agnostic: handler names like `onPointerMove`;
 * attr names like `describedBy`, `role`, `data-*`. Each adapter's
 * normalize() maps the named ones to native props and passes through
 * `data-*` verbatim.
 *
 * See ../SPEC.md for the contract.
 *
 * Sibling files:
 *   - machine.ts  — the state machine config that produces `state` / `context`
 *   - types.ts    — TooltipApi (the return type)
 *   - props.ts    — resolver for raw props
 */

import { connector } from "@render-experiment/machine-core";
import { placementToSide } from "@render-experiment/utils";
import { tooltipProps } from "./props";
import type {
  TooltipApi,
  TooltipContext,
  TooltipProps,
  TooltipState,
} from "./types";

/** Map machine state → data-state value (matches Radix). */
function dataStateFor(
  state: TooltipState,
  context: TooltipContext,
): "closed" | "delayed-open" | "instant-open" {
  if (state === "closed" || state === "opening") return "closed";
  return context.hasInstantOpen ? "instant-open" : "delayed-open";
}

export const connectTooltip = connector<
  TooltipState,
  TooltipContext,
  TooltipProps,
  TooltipApi
>()(({ state, context, props, send }) => {
  const r = tooltipProps(props);
  const open = state === "open" || state === "closing";
  const triggerId = `tooltip:${r.id}:trigger`;
  const contentId = `tooltip:${r.id}:content`;
  const side = placementToSide(r.positioning.placement);
  const dataState = dataStateFor(state, context);

  return {
    open,
    setOpen(next) {
      if (open === next) return;
      send({ type: next ? "open" : "close" });
    },
    parts: {
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
          "data-state": dataState,
          ...(r.disabled ? { "data-disabled": "" } : {}),
        },
      },
      content: {
        handlers: {
          onPointerEnter: () => {
            if (r.disableHoverableContent) return;
            send({ type: "content.pointer.move" });
          },
          onPointerLeave: () => {
            if (r.disableHoverableContent) return;
            send({ type: "content.pointer.leave" });
          },
        },
        attrs: {
          id: contentId,
          role: "tooltip",
          "data-state": dataState,
          "data-side": side,
        },
        variants: { side },
        positioning: r.positioning,
        rendered: open,
      },
    },
  };
});
