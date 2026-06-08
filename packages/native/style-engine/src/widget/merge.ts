/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-shadow */

import type { StyleConfig, StyleVariants } from './types'
import { isObject, memo } from './utils'
import { isStyleRuntimeFn, mergeVariants, mergeCompoundVariants } from './variants'

function merge(...styles: any[]): StyleConfig {
  const mergedStyles = (styles as any[]).flat(Infinity).reduce<StyleConfig>((result, style) => {
    const styleToMerge = isStyleRuntimeFn(style) ? style.config : style
    if (!isObject(styleToMerge)) return result

    return Object.entries(styleToMerge).reduce<StyleConfig>((acc, [key, value]) => {
      if (Array.isArray(value) && key === 'compoundVariants') {
        return { ...acc, compoundVariants: [...(acc.compoundVariants ?? []), ...value] }
      }
      if (isObject(value) && key === 'variants') {
        return {
          ...acc,
          variants: mergeVariants(mergeStyles, acc.variants, value as StyleVariants),
        }
      }
      return { ...acc, [key]: value }
    }, result)
  }, {})

  if (Array.isArray(mergedStyles.compoundVariants)) {
    mergedStyles.compoundVariants = mergeCompoundVariants(
      mergeStyles,
      mergedStyles.compoundVariants,
    )
  }

  return mergedStyles
}

export const mergeStyles = memo(merge)
