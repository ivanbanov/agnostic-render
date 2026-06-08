/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ViewStyle, TextStyle, ImageStyle } from 'react-native'

/** Any RN style object (View / Text / Image share the shape for our purposes). */
export type RNStyle = ViewStyle & TextStyle & ImageStyle

/** A single style value (RN accepts numbers, strings, and nested objects). */
export type StyleValue = RNStyle[keyof RNStyle]

// -----------------------------------------------------------------------------
// Conditions — RN's interaction states (the analog of xwidget's _hover/_focus)
// -----------------------------------------------------------------------------

/** Condition KEY as authored in a style object (`_pressed`, …). */
export type StyleConditionsKey = '_pressed' | '_focused' | '_disabled'

/** Condition VALUE — the runtime flag name the styled component tracks. */
export type StyleConditionsValue = 'pressed' | 'focused' | 'disabled'

/** Map of authored key → runtime flag. */
export type StyleConditionsMapping = Record<StyleConditionsKey, StyleConditionsValue>

/** The runtime condition flags a resolver can be told to apply. */
export type StyleConditionsArgs = Partial<Record<StyleConditionsValue, boolean>>

// -----------------------------------------------------------------------------
// Style objects
// -----------------------------------------------------------------------------

/** A flat RN style object (no conditions, no variants). */
export type Style = Partial<RNStyle>

/** A style object that may also carry condition sub-objects (`_pressed: {...}`). */
export type NestedStyle = Style & Partial<Record<StyleConditionsKey, Style>>

// -----------------------------------------------------------------------------
// Variants
// -----------------------------------------------------------------------------

/** variants: { size: { small: {...}, large: {...} } } */
export type StyleVariants = Record<string, Record<string, NestedStyle>>

/** A compound variant: variant-value constraints + the style to apply. */
export type StyleCompoundVariant = Record<string, any> & { style?: NestedStyle }

/** The full authored config: flat base props + variants + compounds + defaults. */
export type StyleConfig = NestedStyle & {
  variants?: StyleVariants
  compoundVariants?: StyleCompoundVariant[]
  defaultVariants?: Record<string, string | boolean>
}

/** Selected variant values passed to a resolver: { size: 'large' }. */
export type StyleVariantsArgs<T extends StyleVariants = StyleVariants> = {
  [K in keyof T]?: keyof T[K] & string
}

/** Map of variant name → its option keys (for the styled() prop split). */
export type StyleVariantsMap = Map<string, string[]>

// -----------------------------------------------------------------------------
// Resolver function (what styleProps returns)
// -----------------------------------------------------------------------------

export const __StylePropsFnSymbol__: unique symbol = Symbol('styleProps') as any

/**
 * The resolver returned by `styleProps()`. Call it with selected variants (and
 * optional condition flags) to get a flat RN style. Carries `.config` (the
 * merged authored config) and `.variantsMap` for introspection / the styled()
 * prop split, mirroring stitches' resolver.
 */
export interface StyleResolve<V extends StyleVariants = StyleVariants> {
  (variants?: StyleVariantsArgs<V>, conditions?: StyleConditionsArgs): Style
  config: StyleConfig
  variantsMap: StyleVariantsMap
  for: () => StyleResolve<V>
  [__StylePropsFnSymbol__]: true
}

/** A value `styleProps()` / `styled()` accepts as a style source. */
export type StyleInput = StyleConfig | StyleResolve<any> | StyleInput[] | undefined | null

export type StylePropsFn = <V extends StyleVariants = StyleVariants>(
  ...styles: StyleInput[]
) => StyleResolve<V>
