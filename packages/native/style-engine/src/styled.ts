/**
 * The `styled()` RN component factory entry point. Separate from the package
 * root because it imports `react-native` — keeping the root parse-safe for pure
 * consumers (codegen, node-env logic tests).
 *
 *   import { styled } from '@render-experiment/style-engine-native/styled'
 */
export { styled, type StyledOptions } from './widget/styled'
export { styleProps } from './widget/style-props'
export type {
  Style,
  NestedStyle,
  RNStyle,
  StyleConfig,
  StyleResolve,
  StyleInput,
  StyleVariants,
  StyleVariantsArgs,
  StyleConditionsArgs,
} from './widget/types'
