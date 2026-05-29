/**
 * Tooltip props — public types live in `./types`. This file owns the
 * runtime side of props: defaults + raw → resolved resolution.
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
  /**
   * After any tooltip closes, the next tooltip hovered within this many
   * milliseconds opens instantly. 0 disables instant-open entirely.
   */
  skipDelayDuration: 300,
  closeOnEscape: true,
  /** When true, the tooltip closes immediately on pointer leave (no hoverable content). */
  disableHoverableContent: false,
  disabled: false,
  positioning: {
    placement: "bottom" as Placement,
    offset: { main: 4, cross: 0 },
  },
} as const;

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
  skipDelayDuration: number;
  closeOnEscape: boolean;
  disableHoverableContent: boolean;
  disabled: boolean;
  onOpenChange: TooltipProps["onOpenChange"];
  onEscapeKeyDown: TooltipProps["onEscapeKeyDown"];
  positioning: PositioningOptions;
}

// -----------------------------------------------------------------------------
// Resolver
// -----------------------------------------------------------------------------

/**
 * Apply TOOLTIP_DEFAULTS to raw props.
 *
 * Most fields are plain `??` fallback. `positioning` is deep-merged so
 * passing `{ positioning: { placement } }` overrides only that field.
 */
export function tooltipProps(props: TooltipProps): ResolvedTooltipProps {
  return {
    id: props.id,
    open: props.open,
    defaultOpen: props.defaultOpen ?? TOOLTIP_DEFAULTS.defaultOpen,
    openDelay: props.openDelay ?? TOOLTIP_DEFAULTS.openDelay,
    closeDelay: props.closeDelay ?? TOOLTIP_DEFAULTS.closeDelay,
    skipDelayDuration:
      props.skipDelayDuration ?? TOOLTIP_DEFAULTS.skipDelayDuration,
    closeOnEscape: props.closeOnEscape ?? TOOLTIP_DEFAULTS.closeOnEscape,
    disableHoverableContent:
      props.disableHoverableContent ?? TOOLTIP_DEFAULTS.disableHoverableContent,
    disabled: props.disabled ?? TOOLTIP_DEFAULTS.disabled,
    onOpenChange: props.onOpenChange,
    onEscapeKeyDown: props.onEscapeKeyDown,
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
