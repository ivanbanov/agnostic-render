/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  createElement,
  forwardRef,
  useCallback,
  useMemo,
  useState,
  type ComponentType,
  type ReactElement,
} from 'react'
import { Pressable, Text, View } from 'react-native'
import type { GestureResponderEvent } from 'react-native'
import { styleProps } from './style-props'
import { conditionsKeys, conditionsMapping } from './conditions'
import { isStyleRuntimeFn } from './variants'
import type {
  Style,
  StyleConditionsArgs,
  StyleConditionsKey,
  StyleConfig,
  StyleInput,
  StyleResolve,
} from './types'

type AnyProps = Record<string, any>

const PRIMITIVES: Record<string, ComponentType<any>> = { View, Text, Pressable }

const __StyledConfig__: unique symbol = Symbol('styledConfig') as any

interface StyledInternals {
  [__StyledConfig__]: StyleConfig
}

/** A string primitive name or any RN component. */
type StyledTarget = 'View' | 'Text' | 'Pressable' | ComponentType<any>

export interface StyledOptions {
  defaultProps?: AnyProps
  /** Return false to keep a prop from reaching the underlying element. */
  shouldForwardProp?: (prop: string) => boolean
}

/** Which condition keys the config actually declares (so we only wire those). */
function usedConditionKeys(config: StyleConfig): Set<StyleConditionsKey> {
  const used = new Set<StyleConditionsKey>()
  const scan = (obj?: Style | Record<string, any>) => {
    if (!obj) return
    for (const key of conditionsKeys) if (key in obj) used.add(key)
  }
  scan(config)
  for (const name in config.variants) {
    for (const value in config.variants[name]) scan(config.variants[name]![value])
  }
  for (const compound of config.compoundVariants ?? []) scan(compound.style)
  return used
}

export function styled(target: StyledTarget, spec: StyleInput, options: StyledOptions = {}) {
  // Compose with a base styled component's config if `target` is itself styled.
  const baseConfig = (target as Partial<StyledInternals>)[__StyledConfig__]
  const resolver: StyleResolve<any> = baseConfig
    ? styleProps(baseConfig, spec)
    : isStyleRuntimeFn(spec)
      ? spec
      : styleProps(spec)

  const Element: ComponentType<any> =
    typeof target === 'string'
      ? (PRIMITIVES[target] ?? View)
      : (target as Partial<StyledInternals>)[__StyledConfig__]
        ? (target as any).__base
        : (target as ComponentType<any>)

  const variantNames = resolver.variantsMap
  const conditionKeys = usedConditionKeys(resolver.config)
  const wantsPressed = conditionKeys.has('_pressed')
  const wantsFocused = conditionKeys.has('_focused')
  const wantsDisabled = conditionKeys.has('_disabled')

  const Styled = forwardRef<unknown, AnyProps>(function Styled(props, ref): ReactElement {
    const merged = options.defaultProps ? { ...options.defaultProps, ...props } : props

    const [pressed, setPressed] = useState(false)
    const [focused, setFocused] = useState(false)

    // Split variant props out of what we forward; collect the variant selection.
    const { variants, rest } = useMemo(() => {
      const variants: AnyProps = {}
      const rest: AnyProps = {}
      for (const key in merged) {
        if (variantNames.has(key)) variants[key] = merged[key]
        else rest[key] = merged[key]
      }
      return { variants, rest }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [merged])

    const disabled = wantsDisabled ? Boolean(rest.disabled) : false
    const conditions: StyleConditionsArgs = {
      pressed: wantsPressed ? pressed : undefined,
      focused: wantsFocused ? focused : undefined,
      disabled,
    }

    const resolvedStyle = resolver(variants, conditions)

    // Wire interaction handlers only for the conditions the config declares,
    // composing with any consumer-passed handler so both fire.
    const onPressIn = useCallback(
      (e: GestureResponderEvent) => {
        setPressed(true)
        rest.onPressIn?.(e)
      },
      [rest.onPressIn],
    )
    const onPressOut = useCallback(
      (e: GestureResponderEvent) => {
        setPressed(false)
        rest.onPressOut?.(e)
      },
      [rest.onPressOut],
    )
    const onFocus = useCallback(
      (e: any) => {
        setFocused(true)
        rest.onFocus?.(e)
      },
      [rest.onFocus],
    )
    const onBlur = useCallback(
      (e: any) => {
        setFocused(false)
        rest.onBlur?.(e)
      },
      [rest.onBlur],
    )

    const elementProps: AnyProps = {}
    for (const key in rest) {
      if (options.shouldForwardProp && !options.shouldForwardProp(key)) continue
      elementProps[key] = rest[key]
    }

    if (wantsPressed) {
      elementProps.onPressIn = onPressIn
      elementProps.onPressOut = onPressOut
    }
    if (wantsFocused) {
      elementProps.onFocus = onFocus
      elementProps.onBlur = onBlur
    }

    // Consumer `style` layers on top of the resolved style.
    elementProps.style = rest.style != null ? [resolvedStyle, rest.style] : resolvedStyle
    elementProps.ref = ref

    return createElement(Element, elementProps)
  })

  Styled.displayName = `styled(${typeof target === 'string' ? target : (Element.displayName ?? Element.name ?? 'Component')})`
  ;(Styled as any)[__StyledConfig__] = resolver.config
  ;(Styled as any).__base = Element

  return Styled
}

// re-export so callers building conditions by hand have the mapping.
export { conditionsMapping }
