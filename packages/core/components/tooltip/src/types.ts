/**
 * Tooltip — public types.
 *
 * Vocabulary shared across the component's other files (machine.ts,
 * styles.ts) and consumed by adapters. No defaults, no implementation —
 * those live next to the state machine in machine.ts.
 */

import type {
  AttrBindings,
  EventBindings,
  Placement,
  PositioningOptions,
} from "@render-experiment/machine-core";

export type { Placement, PositioningOptions };

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
  /** Render the tooltip with the red color variant. */
  red?: boolean;
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

/**
 * Variant prop set the content part renders with. Computed once in the
 * connect (in terms of state + props) so every adapter consumes the
 * same shape. Adapters spread it on their styled element:
 *
 *   <Styled.Content {...api.content.variants} ... />
 */
export interface TooltipContentVariants {
  side: "top" | "bottom" | "left" | "right";
  red: "true" | "false";
}

export interface TooltipApi {
  open: boolean;
  state: TooltipState;
  setOpen: (next: boolean) => void;
  trigger: { handlers: EventBindings; attrs: AttrBindings };
  content: {
    handlers: EventBindings;
    attrs: AttrBindings;
    variants: TooltipContentVariants;
    positioning: PositioningOptions;
    rendered: boolean;
  };
}
