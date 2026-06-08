/**
 * Dialog styles — the paint, shared across targets. Each export is a part; the
 * codegen translates these specs into per-target styled elements. Every part
 * carries a `variants` key (the codegen's marker for a style spec); the
 * `open` variant lets a target branch enter/exit visuals if it wants.
 *
 * A premium, centered modal: a dimmed backdrop + a white card with a soft
 * shadow, clean title/description typography, and a subtle close button.
 */

export const overlay = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(13, 15, 22, 0.45)',
  // Center the content in the viewport via the overlay (flex host).
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 2147483646,
  variants: {
    open: { true: {}, false: {} },
  },
  defaultVariants: { open: false },
}

export const content = {
  position: 'relative',
  width: '100%',
  maxWidth: 460,
  maxHeight: '85vh',
  overflowY: 'auto',
  background: '#ffffff',
  color: '#1c1e26',
  borderRadius: 16,
  paddingY: 24,
  paddingX: 24,
  boxShadow: '0 24px 64px rgba(13, 15, 22, 0.28)',
  outline: '1px solid transparent',
  zIndex: 2147483647,
  variants: {
    open: { true: {}, false: {} },
  },
  defaultVariants: { open: false },
}

export const title = {
  margin: 0,
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 600,
  lineHeight: '24px',
  color: '#0d0f16',
  variants: {
    open: { true: {}, false: {} },
  },
  defaultVariants: { open: false },
}

export const description = {
  margin: 0,
  marginBottom: 20,
  fontSize: 14,
  lineHeight: '20px',
  color: '#5b6172',
  variants: {
    open: { true: {}, false: {} },
  },
  defaultVariants: { open: false },
}

export const close = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingY: 8,
  paddingX: 14,
  borderRadius: 10,
  border: '1px solid rgba(13, 15, 22, 0.1)',
  background: '#ffffff',
  color: '#1c1e26',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: '20px',
  cursor: 'pointer',
  variants: {
    open: { true: {}, false: {} },
  },
  defaultVariants: { open: false },
}
