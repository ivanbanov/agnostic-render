/* eslint-disable */
import { styled } from '@render-experiment/style-engine-pixi'

// Source: shared/components/tooltip/src/styles → content (primitive: graphics)
export const Content = styled('graphics', {
  base: {
    position: 'absolute',
    pointerEvents: 'auto',
    background: 1645084,
    color: 16777215,
    paddingY: 6,
    paddingX: 8,
    borderRadius: 3,
    fontSize: 14,
    fontWeight: 400,
    lineHeight: '20px',
    fontFamily: 'inherit',
    outline: '1px solid transparent',
    zIndex: 2147483647,
  },
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
  compoundVariants: [],
  defaultVariants: {
    side: 'bottom',
  },
})

// Source: shared/components/tooltip/src/styles → positioner (primitive: container)
export const Positioner = styled('container', {
  base: {
    position: 'fixed',
    width: 0,
    height: 0,
  },
  variants: {
    anchored: {
      true: {
        visibility: 'visible',
      },
      false: {
        visibility: 'hidden',
      },
    },
  },
  compoundVariants: [],
  defaultVariants: {
    anchored: false,
  },
})
