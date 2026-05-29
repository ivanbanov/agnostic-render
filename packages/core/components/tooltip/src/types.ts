/**
 * Tooltip — public types.
 *
 * Vocabulary shared across the component's other files (machine.ts,
 * styles.ts) and consumed by adapters. No defaults, no implementation —
 * those live next to the state machine in machine.ts.
 */

import type { Part } from "@render-experiment/machine-core";
import type {
  Placement,
  PositioningOptions,
} from "@render-experiment/utils";
import type { TooltipContentVariants } from "./parts";

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

export interface TooltipApi {
  open: boolean;
  setOpen: (next: boolean) => void;
  parts: {
    trigger: Part;
    content: Part<
      TooltipContentVariants,
      { positioning: PositioningOptions; rendered: boolean }
    >;
  };
}
