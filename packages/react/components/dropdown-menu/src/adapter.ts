import type { Adapter } from '@render-experiment/machine-core'
import type {
  DropdownMenuComputed,
  DropdownMenuContext,
  DropdownMenuEvent,
} from '@render-experiment/dropdown-menu-core'

// No machine effects to override on web: Escape is a prop-dependent listener
// (gated by closeOnEscape), so it lives in effects.ts as a ComponentEffect the
// generated useApi runs via useEffects — not as a withAdapter machine effect.
export const dropdownMenuAdapter: Adapter<
  DropdownMenuContext,
  DropdownMenuEvent,
  DropdownMenuComputed
> = {}
