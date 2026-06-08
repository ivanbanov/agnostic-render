/* eslint-disable */
import { styled } from '@render-experiment/style-engine-native/styled'

// Source: shared/components/dropdown-menu/src/styles → content
export const Content = styled('View', {
  position: 'absolute',
  backgroundColor: '#FFFFFF',
  color: '#222428',
  borderRadius: 4,
  paddingVertical: 12,
  paddingHorizontal: 12,
  fontSize: 14,
  lineHeight: 20,
  minWidth: 180,
  maxWidth: 500,
  shadowColor: '#050038',
  shadowOffset: {
    width: 0,
    height: 4,
  },
  shadowOpacity: 0.07058823529411765,
  shadowRadius: 16,
  elevation: 8,
  variants: {
    side: {
      top: {
        bottom: '100%',
      },
      bottom: {
        top: '100%',
      },
      left: {
        right: '100%',
      },
      right: {
        left: '100%',
      },
    },
  },
  defaultVariants: {
    side: 'bottom',
  },
} as any)

// Source: shared/components/dropdown-menu/src/styles → group
export const Group = styled('View', {} as any)

// Source: shared/components/dropdown-menu/src/styles → item
export const Item = styled('Pressable', {
  alignItems: 'center',
  gap: 8,
  paddingVertical: 10,
  paddingHorizontal: 8,
  fontSize: 14,
  lineHeight: 20,
  color: '#222428',
  borderRadius: 4,
  position: 'relative',
  variants: {
    highlighted: {
      true: {
        backgroundColor: '#E8ECFC',
        color: '#314CD9',
      },
      false: {
        backgroundColor: 'transparent',
      },
    },
    disabled: {
      true: {
        color: '#AEB2C0',
      },
      false: {},
    },
  },
  defaultVariants: {
    highlighted: false,
    disabled: false,
  },
} as any)

// Source: shared/components/dropdown-menu/src/styles → label
export const Label = styled('View', {
  paddingVertical: 6,
  paddingHorizontal: 8,
  fontSize: 12,
  lineHeight: 16,
  fontWeight: 600,
  color: '#AEB2C0',
} as any)

// Source: shared/components/dropdown-menu/src/styles → positioner
export const Positioner = styled('View', {
  position: 'absolute',
  width: 0,
  height: 0,
  variants: {
    anchored: {
      true: {},
      false: {},
    },
  },
  defaultVariants: {
    anchored: false,
  },
} as any)

// Source: shared/components/dropdown-menu/src/styles → separator
export const Separator = styled('View', {
  height: 1,
  marginVertical: 4,
  marginHorizontal: 0,
  backgroundColor: '#E9EAEF',
} as any)
