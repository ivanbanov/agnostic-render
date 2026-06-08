/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-continue, no-param-reassign */

/**
 * `styleProps()` — the heart of the RN widget engine, ported from xwidget.
 *
 * Composes any number of style sources into one resolver `styleFn(variants?,
 * conditions?)` that returns a flat RN style. Supports variants, compound
 * variants, default variants, and conditional states (`_pressed` / `_focused` /
 * `_disabled`). The merged config is exposed on `.config` for introspection.
 *
 * Difference from the Surface original: no design-token pre-resolution — RN
 * style values are already literal (numbers / strings), so the resolver just
 * merges layers in priority order.
 */

import type {
  NestedStyle,
  Style,
  StyleConditionsArgs,
  StyleConditionsKey,
  StyleConfig,
  StylePropsFn,
} from './types'
import { conditionsMapping, conditionsPriority } from './conditions'
import { mergeStyles } from './merge'
import { getVariantsMap, StylePropsFnSymbol } from './variants'

function extractBaseStyles(style: StyleConfig = {}): NestedStyle {
  const { variants, compoundVariants, defaultVariants, ...base } = style
  return base as NestedStyle
}

/** True if any key in the config tree is a condition key (`_pressed`, …). */
function hasConditionKeys(baseStyles: NestedStyle, config: StyleConfig): boolean {
  for (const key in baseStyles) if (key[0] === '_') return true
  if (config.variants) {
    for (const name in config.variants) {
      const def = config.variants[name]!
      for (const value in def) {
        for (const key in def[value]) if (key[0] === '_') return true
      }
    }
  }
  if (config.compoundVariants) {
    for (const compound of config.compoundVariants) {
      if (compound.style) for (const key in compound.style) if (key[0] === '_') return true
    }
  }
  return false
}

/** Merge one layer into `result`; collect active condition styles by priority. */
function processLayer(
  layer: NestedStyle,
  result: Style,
  conditionStyles: Style[],
  conditions: StyleConditionsArgs | undefined,
): void {
  for (const key in layer) {
    if (!Object.hasOwn(layer, key)) continue
    if (key[0] === '_') {
      const condKey = key as StyleConditionsKey
      if (conditions?.[conditionsMapping[condKey]]) {
        const priority = conditionsPriority[condKey]
        const target = (conditionStyles[priority] ??= {})
        Object.assign(target, layer[condKey])
      }
      continue
    }
    ;(result as any)[key] = (layer as any)[key]
  }
}

export const styleProps: StylePropsFn = function styleProps(...styles) {
  const styleConfig = mergeStyles(...styles) as StyleConfig
  const baseStyles = extractBaseStyles(styleConfig)

  // Flags computed once at definition time so the resolver can skip blocks.
  const hasVariants = styleConfig.variants != null
  const hasCompoundVariants = styleConfig.compoundVariants != null
  const hasDefaultVariants = styleConfig.defaultVariants != null
  const hasConditions = hasConditionKeys(baseStyles, styleConfig)

  function styleFn(variants: Record<string, any> = {}, conditions?: StyleConditionsArgs): Style {
    const result: Style = {}
    const conditionStyles: Style[] = []
    const conds = hasConditions ? conditions : undefined

    const selected = hasDefaultVariants ? { ...styleConfig.defaultVariants, ...variants } : variants

    // 1. Base
    processLayer(baseStyles, result, conditionStyles, conds)

    // 2. Variants
    if (hasVariants) {
      const defs = styleConfig.variants!
      for (const variant in selected) {
        if (!Object.hasOwn(selected, variant)) continue
        const layer = defs[variant]?.[String(selected[variant])]
        if (layer) processLayer(layer, result, conditionStyles, conds)
      }
    }

    // 3. Compound variants
    if (hasCompoundVariants) {
      for (const compound of styleConfig.compoundVariants!) {
        let matches = true
        for (const key in compound) {
          if (!Object.hasOwn(compound, key) || key === 'style') continue
          if (String(selected[key]) !== String(compound[key])) {
            matches = false
            break
          }
        }
        if (matches && compound.style) {
          processLayer(compound.style, result, conditionStyles, conds)
        }
      }
    }

    // 4. Conditions, layered in priority order (later wins).
    for (const styles of conditionStyles) {
      if (styles) Object.assign(result, styles)
    }

    return result
  }

  styleFn.variantsMap = getVariantsMap(styleConfig.variants)
  styleFn.config = styleConfig
  styleFn.for = () => styleFn
  ;(styleFn as any)[StylePropsFnSymbol] = true

  return styleFn as any
} as StylePropsFn
