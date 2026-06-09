/* eslint-disable */
import { styled } from '@render-experiment/style-engine-react'

// Source: shared/components/dialog/src/styles → close
export const Close = styled('button', {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 14,
  paddingRight: 14,
  borderRadius: 10,
  border: '1px solid rgba(13, 15, 22, 0.1)',
  background: '#ffffff',
  color: '#1c1e26',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: '20px',
  cursor: 'pointer',
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [],
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/dialog/src/styles → content
export const Content = styled('div', {
  position: 'relative',
  width: '100%',
  maxWidth: 460,
  maxHeight: '85vh',
  overflowY: 'auto',
  background: '#ffffff',
  color: '#1c1e26',
  borderRadius: 16,
  paddingTop: 24,
  paddingBottom: 24,
  paddingLeft: 24,
  paddingRight: 24,
  boxShadow: '0 24px 64px rgba(13, 15, 22, 0.28)',
  outline: '1px solid transparent',
  zIndex: 2147483647,
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [],
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/dialog/src/styles → description
export const Description = styled('div', {
  margin: 0,
  marginBottom: 20,
  fontSize: 14,
  lineHeight: '20px',
  color: '#5b6172',
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [],
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/dialog/src/styles → overlay
export const Overlay = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(13, 15, 22, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  zIndex: 2147483646,
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [],
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/dialog/src/styles → title
export const Title = styled('div', {
  margin: 0,
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 600,
  lineHeight: '24px',
  color: '#0d0f16',
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  compoundVariants: [],
  defaultVariants: {
    open: false,
  },
} as any)
