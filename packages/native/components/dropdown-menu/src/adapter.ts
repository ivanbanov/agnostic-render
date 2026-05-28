/**
 * React Native adapter for DropdownMenu.
 *
 * trackEscapeKey is a no-op on RN: there's no general Escape key, and we
 * wire the Android back button separately in render.tsx via BackHandler.
 */
import type { Adapter } from "@render-experiment/machine-core";
import type {
  DropdownMenuContext,
  DropdownMenuProps,
} from "@render-experiment/dropdown-menu-core";

export const dropdownMenuAdapter: Adapter<DropdownMenuContext, DropdownMenuProps> = {
  trackEscapeKey: () => undefined,
};
