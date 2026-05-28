/**
 * React DOM adapter for DropdownMenu.
 *
 * Implements effects that the core machine declares as placeholders but
 * can't implement portably (DOM listeners). The generated api.ts merges
 * this map into the machine via withAdapter() before useMachine.
 */
import type { Adapter } from "@render-experiment/machine-core";
import {
  dropdownMenuProps,
  type DropdownMenuContext,
  type DropdownMenuProps,
} from "@render-experiment/dropdown-menu-core";

export const dropdownMenuAdapter: Adapter<DropdownMenuContext, DropdownMenuProps> = {
  // Capture-phase Escape closer so we run before nested popovers/dialogs
  // that might also be listening. Stops propagation so the menu's close
  // doesn't cascade upward.
  trackEscapeKey: ({ props, send }) => {
    if (!dropdownMenuProps(props).closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      send({ type: "escape", src: "keydown.escape" });
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  },
};
