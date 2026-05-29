/**
 * Tooltip connect — translates machine state into a logical surface
 * the view layer consumes.
 *
 * Output is substrate-agnostic: handler names like `onPress`,
 * `onPointerMove`; attr names like `describedBy`, `role`. Each
 * adapter's normalize() maps them to native props.
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

export const connectTooltip = connector<
  TooltipState,
  TooltipContext,
  TooltipProps,
  TooltipApi
>()(({ state, context, props, send }) => {
  void context;
  const r = tooltipProps(props);
  const open = state === "open" || state === "closing";
  const triggerId = `tooltip:${r.id}:trigger`;
  const contentId = `tooltip:${r.id}:content`;

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
        variants: {
          side: placementToSide(r.positioning.placement),
          red: !!r.red,
        },
        positioning: r.positioning,
        rendered: open,
      },
    },
  };
});
