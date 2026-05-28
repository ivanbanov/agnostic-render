/**
 * Tooltip props — public types are in `./types`. This file owns the
 * runtime side of props:
 *
 *   - TOOLTIP_DEFAULTS  — static fact, exported for inspection/docs
 *   - tooltipProps()    — raw → resolved (defaults merged, edge cases handled)
 *
 * Kept separate from machine.ts so a designer collaborator can read the
 * defaults in isolation, without scrolling past the state machine.
 */

import type { Placement, PositioningOptions, TooltipProps } from "./types";

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

export const TOOLTIP_DEFAULTS = {
  defaultOpen: false,
  openDelay: 400,
  closeDelay: 150,
  closeOnEscape: true,
  closeOnClick: true,
  closeOnPointerDown: true,
  interactive: false,
  disabled: false,
  red: false,
  positioning: {
    placement: "bottom" as Placement,
    offset: { main: 4, cross: 0 },
  },
} as const;

/** Window during which a newly-hovered tooltip skips its open delay,
 *  triggered by another tooltip having recently opened. Not a user-tunable
 *  prop — purely a machine-level constant. */
export const TOOLTIP_SKIP_DELAY_MS = 300;

// -----------------------------------------------------------------------------
// Resolved shape
// -----------------------------------------------------------------------------

/** Props after defaults are applied. Machine code only ever sees this
 * shape — every optional prop is concrete, positioning is fully populated. */
export interface ResolvedTooltipProps {
  id: string;
  open: boolean | undefined;
  defaultOpen: boolean;
  openDelay: number;
  closeDelay: number;
  closeOnEscape: boolean;
  closeOnClick: boolean;
  closeOnPointerDown: boolean;
  interactive: boolean;
  disabled: boolean;
  red: boolean;
  onOpenChange: TooltipProps["onOpenChange"];
  positioning: PositioningOptions;
}

// -----------------------------------------------------------------------------
// Resolver
// -----------------------------------------------------------------------------

/**
 * Apply TOOLTIP_DEFAULTS to raw props.
 *
 * Most fields are a plain `??` fallback. Two exceptions, called out
 * explicitly:
 *
 *   - closeOnPointerDown falls back to closeOnClick first, then to the
 *     default. A user who sets `closeOnClick: false` expects pointer
 *     down to inherit that, not stay open.
 *   - positioning is deep-merged: passing `{ positioning: { placement } }`
 *     overrides only that field, keeping the default offset.
 */
export function tooltipProps(props: TooltipProps): ResolvedTooltipProps {
  return {
    id: props.id,
    open: props.open,
    defaultOpen: props.defaultOpen ?? TOOLTIP_DEFAULTS.defaultOpen,
    openDelay: props.openDelay ?? TOOLTIP_DEFAULTS.openDelay,
    closeDelay: props.closeDelay ?? TOOLTIP_DEFAULTS.closeDelay,
    closeOnEscape: props.closeOnEscape ?? TOOLTIP_DEFAULTS.closeOnEscape,
    closeOnClick: props.closeOnClick ?? TOOLTIP_DEFAULTS.closeOnClick,
    // Field-to-field dependency — explicit because it's not just a default.
    closeOnPointerDown:
      props.closeOnPointerDown ??
      props.closeOnClick ??
      TOOLTIP_DEFAULTS.closeOnPointerDown,
    interactive: props.interactive ?? TOOLTIP_DEFAULTS.interactive,
    disabled: props.disabled ?? TOOLTIP_DEFAULTS.disabled,
    red: props.red ?? TOOLTIP_DEFAULTS.red,
    onOpenChange: props.onOpenChange,
    // Deep merge so partial overrides preserve untouched defaults.
    positioning: {
      placement:
        props.positioning?.placement ?? TOOLTIP_DEFAULTS.positioning.placement,
      offset: {
        main:
          props.positioning?.offset?.main ??
          TOOLTIP_DEFAULTS.positioning.offset.main,
        cross:
          props.positioning?.offset?.cross ??
          TOOLTIP_DEFAULTS.positioning.offset.cross,
      },
    },
  };
}
