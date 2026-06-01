export const content = {
  position: 'absolute',
  pointerEvents: 'auto',
  background: '#191a1c',
  color: '#ffffff',
  paddingY: 6,
  paddingX: 8,
  borderRadius: 3,
  fontSize: 14,
  fontWeight: 400,
  lineHeight: '20px',
  fontFamily: 'inherit',
  outline: '1px solid transparent',
  zIndex: 2147483647,
  variants: {
    side: {
      top: { bottom: '100%' },
      bottom: { top: '100%' },
      left: { right: '100%' },
      right: { left: '100%' },
    },
  },
  defaultVariants: {
    side: 'bottom',
  },
}

export const positioner = {
  position: 'fixed',
  width: 0,
  height: 0,
  variants: {
    anchored: {
      true: { visibility: 'visible' },
      false: { visibility: 'hidden' },
    },
  },
  defaultVariants: {
    anchored: false,
  },
}
