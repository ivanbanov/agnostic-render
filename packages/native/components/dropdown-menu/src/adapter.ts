/**
 * React Native adapter for DropdownMenu.
 *
 * trackEscapeKey is a no-op on RN: there's no general Escape key, and we
 * wire the Android back button separately in render.tsx via BackHandler.
 */
import type { Adapter } from '@render-experiment/machine-core'
import type {
  DropdownMenuComputed,
  DropdownMenuContext,
  DropdownMenuEvent,
} from '@render-experiment/dropdown-menu-core'

// No machine effects to override on RN. The Android back button (the RN analog
// of web Escape) is a prop-dependent listener, so it lives in effects.ts as a
// ComponentEffect — not a withAdapter machine effect. Left empty intentionally.
export const dropdownMenuAdapter: Adapter<
  DropdownMenuContext,
  DropdownMenuEvent,
  DropdownMenuComputed
> = {}
