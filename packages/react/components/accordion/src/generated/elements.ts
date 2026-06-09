/* eslint-disable */
import { styled } from '@render-experiment/style-engine-react'

// Source: shared/components/accordion/src/styles → content
export const Content = styled('div', {
  overflow: 'hidden',
  fontSize: 14,
  lineHeight: '21px',
  color: '#5b6172',
  variants: {
    open: {
      true: {
        paddingTop: 2,
        paddingRight: 18,
        paddingBottom: 18,
        paddingLeft: 18,
      },
      false: {
        paddingTop: 0,
        paddingRight: 18,
        paddingBottom: 0,
        paddingLeft: 18,
      },
    },
  },
  compoundVariants: [],
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/accordion/src/styles → header
export const Header = styled('div', {
  display: 'flex',
  margin: 0,
  variants: {},
  compoundVariants: [],
  defaultVariants: {},
} as any)

// Source: shared/components/accordion/src/styles → itemRoot
export const ItemRoot = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  borderTopWidth: 1,
  borderTopColor: 'rgba(13, 15, 22, 0.07)',
  variants: {
    open: {
      true: {},
      false: {},
    },
    disabled: {
      true: {
        opacity: 0.55,
      },
      false: {},
    },
  },
  compoundVariants: [],
  defaultVariants: {
    open: false,
    disabled: false,
  },
} as any)

// Source: shared/components/accordion/src/styles → root
export const Root = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  background: '#ffffff',
  boxShadow:
    '0 0 0 1px rgba(13,15,22,0.06), 0 1px 2px rgba(13,15,22,0.04), 0 8px 24px rgba(13,15,22,0.05)',
  variants: {},
  compoundVariants: [],
  defaultVariants: {},
} as any)

// Source: shared/components/accordion/src/styles → trigger
export const Trigger = styled('button', {
  boxSizing: 'border-box',
  display: 'flex',
  flex: 1,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
  paddingTop: 15,
  paddingBottom: 15,
  paddingLeft: 18,
  paddingRight: 18,
  fontSize: 15,
  lineHeight: '22px',
  fontWeight: 600,
  textAlign: 'left',
  color: '#1c1e26',
  background: 'transparent',
  borderWidth: 0,
  cursor: 'pointer',
  outline: 'none',
  userSelect: 'none',
  variants: {
    open: {
      true: {
        color: '#4658e0',
      },
      false: {},
    },
    disabled: {
      true: {
        color: '#aab0c0',
        cursor: 'default',
      },
      false: {},
    },
  },
  compoundVariants: [],
  defaultVariants: {
    open: false,
    disabled: false,
  },
} as any)
