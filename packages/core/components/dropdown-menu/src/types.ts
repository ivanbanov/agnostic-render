/**
 * DropdownMenu — public types.
 *
 * Mirrors Radix's DropdownMenu vocabulary (Root / Trigger / Content / Item /
 * Group / Label / Separator / CheckboxItem / RadioGroup / RadioItem /
 * ItemIndicator) so consumers can swap. Out of v1 scope: Sub*, Portal,
 * Arrow.
 *
 * No defaults, no implementation — those live in props.ts and machine.ts.
 */

import type {
  AttrBindings,
  EventBindings,
  Placement,
  PositioningOptions,
} from "@render-experiment/machine-core";

export type { Placement, PositioningOptions };

// -----------------------------------------------------------------------------
// Caller-facing props (Radix-shaped)
// -----------------------------------------------------------------------------

export interface DropdownMenuProps {
  /** Stable id for the menu instance. */
  id: string;
  /** Controlled open state. Undefined = uncontrolled. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (details: { open: boolean }) => void;

  /** If false, regular items don't close the menu on activation. Checkbox
   *  and radio items always stay open regardless. */
  closeOnSelect?: boolean;
  /** Esc closes the menu. */
  closeOnEscape?: boolean;
  /** Allow keyboard navigation to wrap around at boundaries. */
  loop?: boolean;
  /** Enable type-ahead character matching. */
  typeahead?: boolean;
  /** Direction; affects which arrow keys open/close submenus.
   *  Accepted for Radix-API parity; v1 doesn't act on it. */
  dir?: "ltr" | "rtl";

  positioning?: Partial<PositioningOptions>;
}

// -----------------------------------------------------------------------------
// Item-level props (each Item the consumer renders supplies these)
// -----------------------------------------------------------------------------

export interface DropdownMenuItemProps {
  /** Stable identifier within this menu. */
  value: string;
  /** Visual text for typeahead matching; defaults to `value` if absent. */
  textValue?: string;
  disabled?: boolean;
  /** Item kind — controls role + how activation closes the menu. */
  kind?: "item" | "checkbox" | "radio";
  /** For checkbox items. */
  checked?: boolean | "indeterminate";
  /** Activation callback. */
  onSelect?: () => void;
}

// -----------------------------------------------------------------------------
// Internal context (machine state)
// -----------------------------------------------------------------------------

export interface DropdownMenuContext {
  /** value of the currently-highlighted item, or null. */
  highlightedValue: string | null;
  /** When true, pointer-move highlight is paused (during keyboard nav). */
  suspendPointer: boolean;
  /** Resolved placement after collision logic (today: just the prop). */
  currentPlacement: Placement;
  /** Type-ahead buffer; cleared after a quiet period. */
  typeaheadBuffer: string;
  /** Time of last typeahead key — adapters compare to clear the buffer. */
  typeaheadLastTime: number;
}

// -----------------------------------------------------------------------------
// States
// -----------------------------------------------------------------------------

export type DropdownMenuState = "idle" | "open";

// -----------------------------------------------------------------------------
// Connect API
// -----------------------------------------------------------------------------

export interface DropdownMenuPart {
  handlers: EventBindings;
  attrs: AttrBindings;
}

/**
 * Variant prop set the content part renders with. Computed once in the
 * connect; adapters spread it on the styled element.
 */
export interface DropdownMenuContentVariants {
  side: "top" | "bottom" | "left" | "right";
}

/**
 * Variant prop set the item part renders with. `highlighted` is also
 * exposed as a boolean for adapters that branch on it; `variants` is
 * the styled-element-friendly string shape.
 */
export interface DropdownMenuItemVariants {
  highlighted: "true" | "false";
  disabled: "true" | "false";
}

export interface DropdownMenuItemPart extends DropdownMenuPart {
  highlighted: boolean;
  variants: DropdownMenuItemVariants;
}

export interface DropdownMenuApi {
  open: boolean;
  state: DropdownMenuState;
  setOpen: (next: boolean) => void;

  trigger: DropdownMenuPart;
  content: DropdownMenuPart & {
    variants: DropdownMenuContentVariants;
    positioning: PositioningOptions;
    rendered: boolean;
  };

  /** Per-item part producer. */
  getItem: (item: DropdownMenuItemProps) => DropdownMenuItemPart;

  /** Static parts — same attrs for every render call. */
  separator: { attrs: AttrBindings };
  label: { attrs: AttrBindings };
  group: { attrs: AttrBindings };

  /**
   * Re-derive the api with the ordered list of menu items wired into the
   * keyboard / pointer handlers. The render layer calls this with the items
   * it's about to render so that ARROW_DOWN, typeahead, etc. can compute
   * "next item" without storing the list inside the machine context.
   */
  withItems: (items: DropdownMenuItemProps[]) => DropdownMenuApi;
}
