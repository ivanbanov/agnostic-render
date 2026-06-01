/**
 * DropdownMenu parts — anatomy + variant types.
 *
 * Names: `parts` (ordered list).
 * Types: each part's variant prop type. Paint lives in
 * @render-experiment/dropdown-menu-shared. Parts with no variants
 * (separator, label, group) don't get a type export.
 *
 * Variant types are component-scoped (DropdownMenuContentVariants, …)
 * so the barrel's `export *` doesn't collide with other components.
 */

import type { Side } from '@render-experiment/utils'

export const parts = ['positioner', 'content', 'item', 'separator', 'label', 'group'] as const
export type Part = (typeof parts)[number]

export type DropdownMenuPositionerVariants = {
  anchored: boolean
}

export type DropdownMenuContentVariants = {
  side: Side
}

export type DropdownMenuItemVariants = {
  highlighted: boolean
  disabled: boolean
}
