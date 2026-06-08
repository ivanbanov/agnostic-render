/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-continue */

import type {
  StyleConfig,
  StyleResolve,
  StyleVariants,
  StyleVariantsMap,
  StyleCompoundVariant,
  Style,
  __StylePropsFnSymbol__,
} from './types'
import { isObject } from './utils'

const StylePropsFnSymbol: typeof __StylePropsFnSymbol__ = Symbol('styleProps') as any

export function isStyleRuntimeFn(fn: any): fn is StyleResolve<any> {
  return typeof fn === 'function' && fn[StylePropsFnSymbol] === true
}

export { StylePropsFnSymbol }

/** variants → Map(name → option keys), for the styled() prop split. */
export function getVariantsMap(variants?: StyleVariants): StyleVariantsMap {
  return new Map(
    Object.entries(variants ?? {}).map(([variant, options]) => [variant, Object.keys(options)]),
  )
}

export function isValidCompoundVariant(variant: StyleCompoundVariant): boolean {
  // At least 2 variant constraints + a `style` key (3 keys total).
  return isObject(variant?.style) && Object.keys(variant).length >= 3
}

/** Deep-merge variant option styles across composed sources. */
export function mergeVariants(
  mergeStyles: (...styles: any[]) => StyleConfig,
  ...variants: Array<StyleVariants | undefined>
): StyleVariants {
  const result: StyleVariants = {}

  for (const variantConfig of variants) {
    if (!isObject(variantConfig)) continue

    for (const [variantName, variantOptions] of Object.entries(variantConfig)) {
      if (!result[variantName]) result[variantName] = {}
      for (const [optionName, optionStyle] of Object.entries(variantOptions)) {
        result[variantName][optionName] = mergeStyles(result[variantName][optionName], optionStyle)
      }
    }
  }

  return result
}

/** Group compound variants by their constraint set, merging the styles within. */
export function mergeCompoundVariants(
  mergeStyles: (...styles: any[]) => StyleConfig,
  variants: StyleCompoundVariant[] = [],
): StyleCompoundVariant[] {
  const groups: Record<string, Style[]> = {}

  for (const variant of variants) {
    if (!isValidCompoundVariant(variant)) continue

    const { style, ...rest } = variant
    const sortedKeys = Object.keys(rest).sort()
    const sortedVariants: Record<string, any> = {}
    for (const key of sortedKeys) sortedVariants[key] = (rest as any)[key]

    const groupKey = JSON.stringify(sortedVariants)
    ;(groups[groupKey] ??= []).push(style!)
  }

  const result: StyleCompoundVariant[] = []
  for (const [groupKey, styles] of Object.entries(groups)) {
    result.push({ ...JSON.parse(groupKey), style: mergeStyles(...styles) })
  }
  return result
}
