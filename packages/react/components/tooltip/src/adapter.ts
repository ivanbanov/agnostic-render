/**
 * React DOM adapter for Tooltip — the machine `Adapter` (named effect impls
 * merged into the config via withAdapter). The tooltip has no DOM-specific
 * MACHINE effects under the new model, so it's empty; the React-side transport
 * (the Escape listener) lives in ./effects.ts as a `ComponentEffect`.
 */
import type { Adapter } from '@render-experiment/machine-core'
import type { TooltipContext, TooltipEvent } from '@render-experiment/tooltip-core'

/** No DOM-specific machine effects for the tooltip under the new model. */
export const tooltipAdapter: Adapter<TooltipContext, TooltipEvent> = {}
