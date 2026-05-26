/**
 * Styled DOM elements for the tooltip, built from the core's agnostic style
 * specs via the style-react adapter.
 *
 * These are internal styled primitives. Imported via a namespace
 * (`import * as Styled from "./elements"`) so call sites read as
 * `Styled.Root` / `Styled.Content` — no collision with the public
 * component names like `TooltipRoot` / `TooltipContent`.
 *
 * A later codegen step is expected to generate this file from the core specs.
 */
import { styled, translateAgnosticSpec } from "@render-experiment/style-react";
import {
  tooltipContentStyle,
  tooltipPositionerStyle,
} from "@render-experiment/tooltip-core";

// Stitches needs an inline literal to infer variant prop types from. We
// widen at the boundary; variant keys still flow through at runtime (and
// are statically typed on the agnostic spec side).

/** Structural root — the zero-size positioner mounted at the anchor point. */
export const Root = styled(
  "div",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  translateAgnosticSpec(tooltipPositionerStyle) as any,
);

/** The painted tooltip body. */
export const Content = styled(
  "div",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  translateAgnosticSpec(tooltipContentStyle) as any,
);
