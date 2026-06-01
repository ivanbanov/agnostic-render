/**
 * React Native adapter for DropdownMenu.
 *
 * trackEscapeKey is a no-op on RN: there's no general Escape key, and we
 * wire the Android back button separately in render.tsx via BackHandler.
 */
import type { Adapter } from '@render-experiment/machine-core'
import type { DropdownMenuContext, DropdownMenuProps } from '@render-experiment/dropdown-menu-core'

// No substrate effects to override: the core's trackEscapeKey no-op stands
// (RN has no general Escape key; the Android back button is wired in render.tsx
// via BackHandler). Left empty intentionally rather than re-stating the no-op.
export const dropdownMenuAdapter: Adapter<DropdownMenuContext, DropdownMenuProps> = {}
