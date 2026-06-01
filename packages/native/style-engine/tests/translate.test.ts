/**
 * Native style-engine — pure-logic tests (no RN runtime needed).
 *
 * translateAgnosticSpecToNative converts the SAME agnostic style spec the
 * web target uses into RN style objects, applying the documented RN
 * differences. resolveStyle flattens base + selected variants at runtime.
 */
import { describe, expect, it } from 'vitest'
import { resolveStyle, translateAgnosticSpecToNative } from '@render-experiment/style-engine-native'

describe('translateAgnosticSpecToNative — axis shorthands', () => {
  it('expands paddingX/paddingY and marginX/marginY to RN axis props', () => {
    const out = translateAgnosticSpecToNative({
      paddingX: 8,
      paddingY: 6,
      marginX: 4,
      marginY: 2,
    })
    expect(out.base).toMatchObject({
      paddingHorizontal: 8,
      paddingVertical: 6,
      marginHorizontal: 4,
      marginVertical: 2,
    })
  })

  it("expands a `padding: '10px 12px'` shorthand into vertical/horizontal", () => {
    const out = translateAgnosticSpecToNative({ padding: '10px 12px' })
    expect(out.base).toMatchObject({
      paddingVertical: 10,
      paddingHorizontal: 12,
    })
  })

  it('maps background to backgroundColor', () => {
    const out = translateAgnosticSpecToNative({ background: '#191a1c' })
    expect(out.base).toMatchObject({ backgroundColor: '#191a1c' })
    expect('background' in out.base).toBe(false)
  })

  it('strips px from numeric props', () => {
    const out = translateAgnosticSpecToNative({
      fontSize: '14px',
      borderRadius: '3px',
      lineHeight: 20,
    })
    expect(out.base).toMatchObject({
      fontSize: 14,
      borderRadius: 3,
      lineHeight: 20,
    })
  })
})

describe('translateAgnosticSpecToNative — web-only props', () => {
  it('drops props with no RN equivalent (cursor, userSelect, outline, etc.)', () => {
    const out = translateAgnosticSpecToNative({
      cursor: 'pointer',
      userSelect: 'none',
      outline: '1px solid transparent',
      boxSizing: 'border-box',
      pointerEvents: 'auto',
    })
    expect(out.base).toEqual({})
  })

  it('collapses position: fixed/sticky to absolute', () => {
    expect(translateAgnosticSpecToNative({ position: 'fixed' }).base).toEqual({
      position: 'absolute',
    })
    expect(translateAgnosticSpecToNative({ position: 'sticky' }).base).toEqual({
      position: 'absolute',
    })
    expect(translateAgnosticSpecToNative({ position: 'relative' }).base).toEqual({
      position: 'relative',
    })
  })

  it('decomposes boxShadow into RN shadow* + elevation, stripping hex alpha', () => {
    const out = translateAgnosticSpecToNative({
      boxShadow: '0 4px 16px #05003812',
    })
    expect(out.base).toMatchObject({
      shadowColor: '#050038',
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 16,
      elevation: 8,
    })
    // #..12 alpha → ~0.07 opacity
    expect(out.base.shadowOpacity).toBeCloseTo(0x12 / 255, 5)
  })
})

describe('translateAgnosticSpecToNative — variants', () => {
  it('translates each variant option and preserves defaultVariants', () => {
    const out = translateAgnosticSpecToNative({
      background: '#fff',
      variants: {
        side: {
          top: { marginY: 4 },
          bottom: { marginY: 8 },
        },
      },
      defaultVariants: { side: 'bottom' },
    })
    expect(out.variants.side.top).toMatchObject({ marginVertical: 4 })
    expect(out.variants.side.bottom).toMatchObject({ marginVertical: 8 })
    expect(out.defaultVariants).toEqual({ side: 'bottom' })
  })
})

describe('resolveStyle', () => {
  const spec = translateAgnosticSpecToNative({
    paddingX: 8,
    background: '#191a1c',
    variants: {
      side: {
        top: { marginY: 4 },
        bottom: { marginY: 8 },
      },
    },
    defaultVariants: { side: 'bottom' },
  })

  it('merges base with the selected variant', () => {
    const out = resolveStyle(spec, { side: 'top' })
    expect(out).toMatchObject({
      paddingHorizontal: 8,
      backgroundColor: '#191a1c',
      marginVertical: 4,
    })
  })

  it('falls back to defaultVariants when no selection is given', () => {
    const out = resolveStyle(spec, {})
    expect(out.marginVertical).toBe(8) // default side=bottom
  })

  it('applies a matching compound variant over base + variants', () => {
    const compound = translateAgnosticSpecToNative({
      background: '#fff',
      variants: {
        highlighted: { true: { background: '#eee' }, false: {} },
        disabled: { true: {}, false: {} },
      },
      compoundVariants: [{ highlighted: true, disabled: false, css: { background: '#cdf' } }],
      defaultVariants: { highlighted: 'false', disabled: 'false' },
    })
    const out = resolveStyle(compound, { highlighted: true, disabled: false })
    expect(out.backgroundColor).toBe('#cdf')
  })
})
