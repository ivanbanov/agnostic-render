/**
 * Tooltip — public types.
 *
 * Vocabulary shared across the component's other files (behavior.ts,
 * styles.ts) and consumed by adapters. No defaults, no implementation —
 * those live next to the state machine in behavior.ts.
 */

import type {
  LogicalAttrs,
  LogicalHandlers,
} from "@render-experiment/behavior-core";

// -----------------------------------------------------------------------------
// Positioning
// -----------------------------------------------------------------------------

export type Placement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

export interface PositioningOptions {
  placement: Placement;
  offset: { main: number; cross: number };
}

// -----------------------------------------------------------------------------
// Caller-facing props
// -----------------------------------------------------------------------------

export interface TooltipProps {
  id: string;
  /** Controlled open state. Pass `undefined` for uncontrolled. */
  open?: boolean;
  defaultOpen?: boolean;
  openDelay?: number;
  closeDelay?: number;
  closeOnEscape?: boolean;
  closeOnClick?: boolean;
  closeOnPointerDown?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  positioning?: Partial<PositioningOptions>;
  onOpenChange?: (details: { open: boolean }) => void;
}

// -----------------------------------------------------------------------------
// Internal context (machine state)
// -----------------------------------------------------------------------------

export interface TooltipContext {
  hasPointerMoveOpened: boolean;
  placement: Placement;
}

export type TooltipState = "closed" | "opening" | "open" | "closing";

// -----------------------------------------------------------------------------
// Connect API (consumed by adapter render layer)
// -----------------------------------------------------------------------------

export interface TooltipApi {
  open: boolean;
  state: TooltipState;
  setOpen: (next: boolean) => void;
  trigger: { handlers: LogicalHandlers; attrs: LogicalAttrs };
  content: {
    handlers: LogicalHandlers;
    attrs: LogicalAttrs;
    positioning: PositioningOptions;
    rendered: boolean;
  };
}
