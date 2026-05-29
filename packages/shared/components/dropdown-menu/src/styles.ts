/**
 * Ported from @mirohq/design-system DropdownMenu, medium size.
 *
 * Token → literal mapping (web tokens, light theme):
 *   $50            → 4px                   (space, border-radius)
 *   $100           → 8px                   (space)
 *   $125           → 500px                 (sizes — 125 * 4)
 *   $150           → 12px                  (space)
 *   $300           → 24px                  (space)
 *   $background-neutrals-container → #FFFFFF
 *   $background-primary-subtle-hover → #E8ECFC   (blue-150)
 *   $background-primary-subtle-active → #D9DFFC  (blue-200)
 *   $text-neutrals → #222428                (gray-900)
 *   $text-neutrals-disabled → #AEB2C0       (gray-350)
 *   $text-primary-hover  → #314CD9          (blue-550)
 *   $text-primary-active → #2A41B6          (blue-600)
 *   $shadows-50          → 0 4px 16px #05003812
 *   $border-neutrals-strong-subtle → #E9EAEF (gray-150)  (separator)
 */

export const positioner = {
  position: "fixed",
  width: 0,
  height: 0,
  variants: {
    anchored: {
      true: { visibility: "visible" },
      false: { visibility: "hidden" },
    },
  },
  defaultVariants: {
    anchored: false,
  },
};

export const content = {
  position: "absolute",
  pointerEvents: "auto",
  background: "#FFFFFF",
  color: "#222428",
  borderRadius: 4,
  padding: "12px 12px",
  fontSize: 14,
  lineHeight: "20px",
  minWidth: 180,
  maxWidth: 500,
  boxShadow: "0 4px 16px #05003812",
  outline: "1px solid transparent",
  variants: {
    side: {
      top: { bottom: "100%" },
      bottom: { top: "100%" },
      left: { right: "100%" },
      right: { left: "100%" },
    },
  },
  defaultVariants: {
    side: "bottom",
  },
};

export const item = {
  boxSizing: "border-box",
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gridTemplateAreas: '"left-slot item-text right-slot"',
  alignItems: "center",
  gap: 8,
  padding: "10px 8px",
  fontSize: 14,
  lineHeight: "20px",
  color: "#222428",
  borderRadius: 4,
  position: "relative",
  userSelect: "none",
  cursor: "pointer",
  outline: "none",
  variants: {
    highlighted: {
      true: {
        background: "#E8ECFC",
        color: "#314CD9",
      },
      false: { background: "transparent" },
    },
    disabled: {
      true: {
        color: "#AEB2C0",
        cursor: "default",
        pointerEvents: "none",
      },
      false: {},
    },
  },
  defaultVariants: {
    highlighted: false,
    disabled: false,
  },
};

export const separator = {
  height: 1,
  marginY: 4,
  marginX: 0,
  background: "#E9EAEF",
  variants: {},
};

export const label = {
  padding: "6px 8px",
  fontSize: 12,
  lineHeight: "16px",
  fontWeight: 600,
  color: "#AEB2C0",
  variants: {},
};

export const group = {
  display: "block",
  variants: {},
};
