/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-shadow */

/**
 * Compose several style sources (objects, arrays, or other styleProps fns) into
 * one StyleConfig. Ported from xwidget: later sources win on flat props;
 * variants deep-merge; compoundVariants concatenate then group. Memoized by
 * argument identity so repeated composition of stable inputs is free.
 */

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
