/**
 * DropdownMenu props — public types are in `./types`. This file owns the
 * runtime side of props:
 *
 *   - DROPDOWN_MENU_DEFAULTS  — static fact, exported for inspection/docs
 *   - dropdownMenuProps()     — raw → resolved (defaults merged)
 *
 * Kept separate from machine.ts so a designer collaborator can read the
 * defaults in isolation, without scrolling past the state machine.
 */

import type {
  DropdownMenuProps,
  Placement,
  PositioningOptions,
} from "./types";

// -----------------------------------------------------------------------------
// Defaults
// -----------------------------------------------------------------------------

export const DROPDOWN_MENU_DEFAULTS = {
  defaultOpen: false,
  closeOnSelect: true,
  closeOnEscape: true,
  focusTrap: false,
  loop: true,
  typeahead: true,
  dir: "ltr" as const,
  positioning: {
    placement: "bottom-start" as Placement,
    offset: { main: 4, cross: 0 },
  },
} as const;

/** Maximum gap between typeahead keypresses before the buffer resets. */
export const TYPEAHEAD_RESET_MS = 500;

// -----------------------------------------------------------------------------
// Resolved shape
// -----------------------------------------------------------------------------

/** Props after defaults are applied. Machine code only ever sees this
 * shape — every optional prop is concrete, positioning is fully populated. */
export interface ResolvedDropdownMenuProps {
  id: string;
  open: boolean | undefined;
  defaultOpen: boolean;
  closeOnSelect: boolean;
  closeOnEscape: boolean;
  focusTrap: boolean;
  loop: boolean;
  typeahead: boolean;
  dir: "ltr" | "rtl";
  onOpenChange: DropdownMenuProps["onOpenChange"];
  positioning: PositioningOptions;
}

// -----------------------------------------------------------------------------
// Resolver
// -----------------------------------------------------------------------------

/**
 * Apply DROPDOWN_MENU_DEFAULTS to raw props. `positioning` is deep-merged
 * so passing `{ positioning: { placement } }` overrides only that field.
 */
export function dropdownMenuProps(
  props: DropdownMenuProps,
): ResolvedDropdownMenuProps {
  return {
    id: props.id,
    open: props.open,
    defaultOpen: props.defaultOpen ?? DROPDOWN_MENU_DEFAULTS.defaultOpen,
    closeOnSelect: props.closeOnSelect ?? DROPDOWN_MENU_DEFAULTS.closeOnSelect,
    closeOnEscape: props.closeOnEscape ?? DROPDOWN_MENU_DEFAULTS.closeOnEscape,
    focusTrap: props.focusTrap ?? DROPDOWN_MENU_DEFAULTS.focusTrap,
    loop: props.loop ?? DROPDOWN_MENU_DEFAULTS.loop,
    typeahead: props.typeahead ?? DROPDOWN_MENU_DEFAULTS.typeahead,
    dir: props.dir ?? DROPDOWN_MENU_DEFAULTS.dir,
    onOpenChange: props.onOpenChange,
    positioning: {
      placement:
        props.positioning?.placement ??
        DROPDOWN_MENU_DEFAULTS.positioning.placement,
      offset: {
        main:
          props.positioning?.offset?.main ??
          DROPDOWN_MENU_DEFAULTS.positioning.offset.main,
        cross:
          props.positioning?.offset?.cross ??
          DROPDOWN_MENU_DEFAULTS.positioning.offset.cross,
      },
    },
  };
}
