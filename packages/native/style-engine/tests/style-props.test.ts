import { describe, expect, it } from 'vitest'
// The package root is RN-free (styleProps + translate); `styled` ships from the
// separate /styled entry, covered by the jest+RNTL suite (styled.test.tsx).
import { styleProps } from '@render-experiment/style-engine-native'

describe('styleProps — base + resolution', () => {
  it('returns the flat base style', () => {
    const s = styleProps({ backgroundColor: 'red', width: 10 })
    expect(s()).toEqual({ backgroundColor: 'red', width: 10 })
  })

  it('exposes the merged config on .config', () => {
    const s = styleProps({ backgroundColor: 'red', width: 10 })
    expect(s.config).toEqual({ backgroundColor: 'red', width: 10 })
  })
})

describe('styleProps — composition', () => {
  it('merges objects, arrays, and other styleProps fns (later wins)', () => {
    const obj = styleProps({ width: 10 })
    const arr = [{ backgroundColor: 'red', left: 10 }]
    const fn = styleProps({ width: 20 })
    const composed = styleProps(obj, arr, fn)
    expect(composed()).toEqual({ width: 20, backgroundColor: 'red', left: 10 })
  })
})

describe('styleProps — variants', () => {
  const s = styleProps({
    backgroundColor: 'black',
    variants: {
      status: { info: { backgroundColor: 'blue' }, error: { backgroundColor: 'red' } },
      size: { small: { width: 10 }, large: { width: 20 } },
    },
  })

  it('applies the selected variant over base', () => {
    expect(s({ status: 'info' })).toEqual({ backgroundColor: 'blue' })
    expect(s()).toEqual({ backgroundColor: 'black' })
  })

  it('applies multiple variants together', () => {
    expect(s({ status: 'error', size: 'large' })).toEqual({ backgroundColor: 'red', width: 20 })
  })
})

describe('styleProps — default variants', () => {
  it('uses defaults when no selection is passed', () => {
    const s = styleProps({
      variants: {
        status: { info: { backgroundColor: 'blue' }, error: { backgroundColor: 'red' } },
      },
      defaultVariants: { status: 'info' },
    })
    expect(s()).toEqual({ backgroundColor: 'blue' })
    expect(s({ status: 'error' })).toEqual({ backgroundColor: 'red' })
  })
})

describe('styleProps — compound variants', () => {
  it('applies a compound style only when every constraint matches', () => {
    const s = styleProps({
      variants: {
        status: { info: { backgroundColor: 'blue' }, error: { backgroundColor: 'red' } },
        size: { small: { width: 10 }, large: { width: 20 } },
      },
      compoundVariants: [{ status: 'info', size: 'small', style: { backgroundColor: 'green' } }],
    })
    expect(s({ status: 'info', size: 'small' })).toEqual({ backgroundColor: 'green', width: 10 })
    expect(s({ status: 'info', size: 'large' })).toEqual({ backgroundColor: 'blue', width: 20 })
  })
})

describe('styleProps — conditions', () => {
  const s = styleProps({
    backgroundColor: 'white',
    _pressed: { backgroundColor: 'blue' },
    _focused: { backgroundColor: 'green' },
    _disabled: { backgroundColor: 'gray' },
  })

  it('ignores condition styles when no flags are active', () => {
    expect(s()).toEqual({ backgroundColor: 'white' })
  })

  it('applies a single active condition', () => {
    expect(s({}, { pressed: true })).toEqual({ backgroundColor: 'blue' })
    expect(s({}, { disabled: true })).toEqual({ backgroundColor: 'gray' })
  })

  it('layers active conditions in priority order (disabled < focused < pressed)', () => {
    // pressed has the highest priority, so it wins when several are active.
    expect(s({}, { disabled: true, focused: true, pressed: true })).toEqual({
      backgroundColor: 'blue',
    })
    expect(s({}, { disabled: true, focused: true })).toEqual({ backgroundColor: 'green' })
  })

  it('supports conditions nested inside a variant', () => {
    const v = styleProps({
      variants: {
        tone: { danger: { backgroundColor: 'red', _pressed: { backgroundColor: 'darkred' } } },
      },
    })
    expect(v({ tone: 'danger' })).toEqual({ backgroundColor: 'red' })
    expect(v({ tone: 'danger' }, { pressed: true })).toEqual({ backgroundColor: 'darkred' })
  })
})

describe('styleProps — variantsMap', () => {
  it('lists variant names and their option keys', () => {
    const s = styleProps({
      variants: { size: { small: { width: 10 }, large: { width: 20 } } },
    })
    expect(s.variantsMap.get('size')).toEqual(['small', 'large'])
  })
})
