/* eslint-disable */
import { styled } from '@render-experiment/style-engine-pixi'

// Source: shared/components/dropdown-menu/src/styles → content (primitive: graphics)
export const Content = styled('graphics', {
  base: {
    position: 'absolute',
    pointerEvents: 'auto',
    background: 16777215,
    color: 2237480,
    borderRadius: 4,
    padding: '12px 12px',
    fontSize: 14,
    lineHeight: '20px',
    minWidth: 180,
    maxWidth: 500,
    boxShadow: '0 4px 16px #05003812',
    outline: '1px solid transparent',
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

// Source: shared/components/dropdown-menu/src/styles → group (primitive: container)
export const Group = styled('container', {
  base: {
    display: 'block',
  },
  variants: {},
  compoundVariants: [],
  defaultVariants: {},
})

// Source: shared/components/dropdown-menu/src/styles → item (primitive: graphics)
export const Item = styled('graphics', {
  base: {
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr auto',
    gridTemplateAreas: '"left-slot item-text right-slot"',
    alignItems: 'center',
    gap: 8,
    padding: '10px 8px',
    fontSize: 14,
    lineHeight: '20px',
    color: 2237480,
    borderRadius: 4,
    position: 'relative',
    userSelect: 'none',
    cursor: 'pointer',
    outline: 'none',
  },
  variants: {
    highlighted: {
      true: {
        background: 15265020,
        color: 3230937,
      },
      false: {
        background: 0,
      },
    },
    disabled: {
      true: {
        color: 11449024,
        cursor: 'default',
        pointerEvents: 'none',
      },
      false: {},
    },
  },
  compoundVariants: [],
  defaultVariants: {
    highlighted: false,
    disabled: false,
  },
})

// Source: shared/components/dropdown-menu/src/styles → label (primitive: text)
export const Label = styled('text', {
  base: {
    padding: '6px 8px',
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 600,
    color: 11449024,
  },
  variants: {},
  compoundVariants: [],
  defaultVariants: {},
})

// Source: shared/components/dropdown-menu/src/styles → positioner (primitive: container)
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

// Source: shared/components/dropdown-menu/src/styles → separator (primitive: graphics)
export const Separator = styled('graphics', {
  base: {
    height: 1,
    marginY: 4,
    marginX: 0,
    background: 15330031,
  },
  variants: {},
  compoundVariants: [],
  defaultVariants: {},
})
