/* eslint-disable */
import { styled } from '@render-experiment/style-engine-native/styled'

// Source: shared/components/accordion/src/styles → content
export const Content = styled('View', {
  overflow: 'hidden',
  fontSize: 14,
  lineHeight: 21,
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
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/accordion/src/styles → header
export const Header = styled('View', {
  margin: 0,
} as any)

// Source: shared/components/accordion/src/styles → itemRoot
export const ItemRoot = styled('View', {
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
  defaultVariants: {
    open: false,
    disabled: false,
  },
} as any)

// Source: shared/components/accordion/src/styles → root
export const Root = styled('View', {
  flexDirection: 'column',
  width: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  backgroundColor: '#ffffff',
} as any)

// Source: shared/components/accordion/src/styles → trigger
export const Trigger = styled('Pressable', {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  width: '100%',
  paddingVertical: 15,
  paddingHorizontal: 18,
  fontSize: 15,
  lineHeight: 22,
  fontWeight: 600,
  textAlign: 'left',
  color: '#1c1e26',
  backgroundColor: 'transparent',
  borderWidth: 0,
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
      },
      false: {},
    },
  },
  defaultVariants: {
    open: false,
    disabled: false,
  },
} as any)
