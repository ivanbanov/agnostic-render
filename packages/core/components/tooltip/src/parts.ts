/**
 * Tooltip parts — anatomy + variant types.
 *
 * Names: `parts` (ordered list of parts the component renders).
 * Types: each part's variant prop type. Adapters consume these to type
 * their styled wrappers; the actual paint lives in
 * @render-experiment/tooltip-shared.
 *
 * Variant types are component-scoped (TooltipContentVariants, …) so
 * the barrel's `export *` doesn't collide with other components.
 */

import type { Side } from '@render-experiment/utils'

export const parts = ['positioner', 'content'] as const
export type Part = (typeof parts)[number]

export type TooltipPositionerVariants = {
  anchored: boolean
}

export type TooltipContentVariants = {
  side: Side
}
