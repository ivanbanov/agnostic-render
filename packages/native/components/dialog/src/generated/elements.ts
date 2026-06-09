/* eslint-disable */
import { styled } from '@render-experiment/style-engine-native/styled'

// Source: shared/components/dialog/src/styles → close
export const Close = styled('Pressable', {
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 8,
  paddingHorizontal: 14,
  borderRadius: 10,
  border: '1px solid rgba(13, 15, 22, 0.1)',
  backgroundColor: '#ffffff',
  color: '#1c1e26',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: 20,
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/dialog/src/styles → content
export const Content = styled('View', {
  position: 'relative',
  width: '100%',
  maxWidth: 460,
  maxHeight: '85vh',
  overflowY: 'auto',
  backgroundColor: '#ffffff',
  color: '#1c1e26',
  borderRadius: 16,
  paddingVertical: 24,
  paddingHorizontal: 24,
  shadowColor: 'rgba(13, 15, 22, 0.28)',
  shadowOffset: {
    width: 0,
    height: 24,
  },
  shadowOpacity: 1,
  shadowRadius: 64,
  elevation: 32,
  zIndex: 2147483647,
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/dialog/src/styles → description
export const Description = styled('Text', {
  margin: 0,
  marginBottom: 20,
  fontSize: 14,
  lineHeight: 20,
  color: '#5b6172',
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/dialog/src/styles → overlay
export const Overlay = styled('View', {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(13, 15, 22, 0.45)',
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
  defaultVariants: {
    open: false,
  },
} as any)

// Source: shared/components/dialog/src/styles → title
export const Title = styled('Text', {
  margin: 0,
  marginBottom: 8,
  fontSize: 18,
  fontWeight: 600,
  lineHeight: 24,
  color: '#0d0f16',
  variants: {
    open: {
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    open: false,
  },
} as any)
