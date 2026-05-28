/**
 * Pixi adapter for DropdownMenu.
 *
 * Pixi runs in a browser; window-level keydown is fine. Capture phase so
 * nested overlays don't swallow Escape before we see it.
 */
import type { Adapter } from "@render-experiment/machine-core";
import {
  dropdownMenuProps,
  type DropdownMenuContext,
  type DropdownMenuProps,
} from "@render-experiment/dropdown-menu-core";

export const dropdownMenuAdapter: Adapter<DropdownMenuContext, DropdownMenuProps> = {
  trackEscapeKey: ({ props, send }) => {
    if (!dropdownMenuProps(props).closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      send({ type: "escape", src: "keydown.escape" });
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  },
};
