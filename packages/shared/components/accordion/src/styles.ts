/**
 * Accordion — shared style specs (one per part).
 *
 * Codegen reads each camelCase const whose value has a `variants` field and
 * emits a styled wrapper per target. Parts: root, itemRoot, header, trigger,
 * content. The interactive part (`trigger`) maps to a <button> / Pressable;
 * the rest map to <div> / View.
 *
 * NOTE: the section-container style is named `itemRoot`, NOT `item` — the
 * codegen treats a part literally named `item` as INTERACTIVE (a <button>),
 * which is right for the dropdown's activatable row but wrong here: the
 * accordion's section container is a passive grouping element whose only
 * interactive child is the trigger. The public component is still
 * `Accordion.Item`; only the styled element name differs.
 */

// Palette mirrors the sandbox UI kit + the dialog: near-black headings
// (#0d0f16), body (#1c1e26), muted (#5b6172), an indigo accent (#5b73ff), and
// the soft rgba(13,15,22,...) borders/shadows. Keeps the accordion visually of
// a piece with the tooltip / dropdown / dialog demos.

export const root = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  background: '#ffffff',
  // Card edge is shadow + radius (like the dialog) — no 1px border, so the
  // first item's top divider reads as the clean top hairline without doubling.
  boxShadow:
    '0 0 0 1px rgba(13,15,22,0.06), 0 1px 2px rgba(13,15,22,0.04), 0 8px 24px rgba(13,15,22,0.05)',
  variants: {},
}

export const itemRoot = {
  display: 'flex',
  flexDirection: 'column',
  // A hairline divider between every section. The first item's top border sits
  // flush with the card's rounded edge (no root border to double it). Longhand
  // border props (not the `border` shorthand) so the RN translator passes them
  // through cleanly — RN has no shorthand parser.
  borderTopWidth: 1,
  borderTopColor: 'rgba(13, 15, 22, 0.07)',
  variants: {
    open: {
      true: {},
      false: {},
    },
    disabled: {
      true: { opacity: 0.55 },
      false: {},
    },
  },
  defaultVariants: {
    open: false,
    disabled: false,
  },
}

export const header = {
  display: 'flex',
  margin: 0,
  variants: {},
}

export const trigger = {
  boxSizing: 'border-box',
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
  paddingY: 15,
  paddingX: 18,
  fontSize: 15,
  lineHeight: '22px',
  fontWeight: 600,
  textAlign: 'left',
  color: '#1c1e26',
  background: 'transparent',
  // Longhand zero-border (not `border: none`) — RN takes a numeric borderWidth.
  borderWidth: 0,
  cursor: 'pointer',
  outline: 'none',
  userSelect: 'none',
  variants: {
    open: {
      true: { color: '#4658e0' },
      false: {},
    },
    disabled: {
      true: { color: '#aab0c0', cursor: 'default' },
      false: {},
    },
  },
  defaultVariants: {
    open: false,
    disabled: false,
  },
}

export const content = {
  overflow: 'hidden',
  fontSize: 14,
  lineHeight: '21px',
  color: '#5b6172',
  variants: {
    open: {
      true: { paddingTop: 2, paddingRight: 18, paddingBottom: 18, paddingLeft: 18 },
      false: { paddingTop: 0, paddingRight: 18, paddingBottom: 0, paddingLeft: 18 },
    },
  },
  defaultVariants: {
    open: false,
  },
}
