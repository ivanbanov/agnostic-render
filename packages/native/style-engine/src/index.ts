/**
 * Style spec → React Native style object translator.
 *
 * Mirror of @render-experiment/style-engine-react's translateAgnosticSpec, but
 * produces RN style objects (camelCase, RN-supported subset) instead of
 * Stitches config.
 *
 *   Input:  the same agnostic spec authored in core/components/<slug>/styles.ts
 *   Output: { base: ViewStyle, variants: { side: { top: {...}, ... } } }
 *
 * Consumers (usually generated elements.ts) call `resolveStyle(translated, { side: 'top' })`
 * at render time to flatten base + selected variant into a single style.
 *
 * Codegen calls `translateAgnosticSpecToNative(spec)` at build time and inlines
 * the result as a literal.
 *
 * The stitches-like authoring surface lives under ./widget:
 *  - `styleProps` (pure — composition + resolution) is re-exported here.
 *  - `styled` (the RN component factory — imports react-native) ships from the
 *    separate `@render-experiment/style-engine-native/styled` entry, so pure
 *    consumers (codegen, logic tests) never load react-native.
 */

export { styleProps } from './widget/style-props'
export { conditionsMapping, conditionsKeys } from './widget/conditions'
export type {
  Style as WidgetStyle,
  NestedStyle,
  RNStyle as WidgetRNStyle,
  StyleConfig,
  StyleResolve,
  StyleInput,
  StyleVariants,
  StyleVariantsArgs,
  StyleConditionsArgs,
  StyleConditionsKey,
  StyleConditionsValue,
} from './widget/types'

type StyleValue = string | number | boolean

interface AgnosticStyleObject {
  paddingX?: StyleValue
  paddingY?: StyleValue
  marginX?: StyleValue
  marginY?: StyleValue
  [k: string]: StyleValue | StyleValue[] | undefined
}

interface AgnosticStyleSpec {
  variants?: Record<string, Record<string, AgnosticStyleObject>>
  compoundVariants?: Array<Record<string, unknown> & { css: AgnosticStyleObject }>
  defaultVariants?: Record<string, string | boolean>
  [prop: string]: unknown
}

type RNStyleValue = string | number | { width: number; height: number }
type RNStyle = Record<string, RNStyleValue>

const RESERVED_SPEC_KEYS = new Set(['variants', 'compoundVariants', 'defaultVariants'])

// Props that have no RN equivalent. Listed explicitly so the translator
// doesn't silently leak them through to a runtime where they'd be ignored.
const RN_DROP = new Set([
  'pointerEvents', // RN has its own pointerEvents prop, not a style.
  'visibility', // No direct RN analog; consumers toggle opacity or render conditionally.
  'cursor', // No-op on mobile.
  'userSelect', // No-op.
  'outline', // Web-only; focus rings are RN-specific.
  'boxSizing', // RN boxes are always border-box.
  'display', // RN has no grid/block/inline-block; flex/none only — leave to component.
  'gridTemplateColumns',
  'gridTemplateRows',
  'gridTemplateAreas',
  'gridArea',
])

// "10px 12px" → { paddingVertical: 10, paddingHorizontal: 12 }
// "10px"      → { paddingVertical: 10, paddingHorizontal: 10 }
function expandShorthand(
  value: string | number,
  axisProp: { vertical: string; horizontal: string },
): RNStyle | null {
  if (typeof value === 'number') return null
  const parts = value.split(/\s+/).filter(Boolean)
  const toN = (s: string) => {
    const n = Number(s.replace(/px$/, ''))
    return Number.isFinite(n) ? n : null
  }
  if (parts.length === 1) {
    const n = toN(parts[0]!)
    return n === null ? null : { [axisProp.vertical]: n, [axisProp.horizontal]: n }
  }
  if (parts.length === 2) {
    const v = toN(parts[0]!)
    const h = toN(parts[1]!)
    return v === null || h === null ? null : { [axisProp.vertical]: v, [axisProp.horizontal]: h }
  }
  return null
}

// "16px" → 16. Returns the original value if it can't be coerced.
function stripPx(v: string | number): number | string {
  if (typeof v === 'number') return v
  const m = /^(-?\d+(?:\.\d+)?)px$/.exec(v)
  return m ? Number(m[1]) : v
}

// Decompose "0 4px 16px #05003812" into RN-friendly shadow* props.
// Returns null when the value is anything other than a single offset+blur+color.
function expandBoxShadow(value: string): {
  shadowColor: string
  shadowOffset: { width: number; height: number }
  shadowOpacity: number
  shadowRadius: number
  elevation: number
} | null {
  // Match: <offsetX> <offsetY> <blur> <color>
  // Each numeric value is either bare (e.g. `0`) or px-suffixed (`4px`).
  // Color can be #rrggbb, #rrggbbaa, or rgba(...).
  const num = String.raw`(-?\d+(?:\.\d+)?)(?:px)?`
  const re = new RegExp(`^${num}\\s+${num}\\s+${num}\\s+(#[0-9a-fA-F]+|rgba?\\([^)]+\\))$`)
  const m = re.exec(value.trim())
  if (!m) return null
  const offsetX = Number(m[1])
  const offsetY = Number(m[2])
  const blur = Number(m[3])
  let color = m[4]!
  let opacity = 1
  // #rrggbbaa → strip alpha into opacity (RN supports it but iOS expects it
  // separately on shadowOpacity).
  const hexAlpha = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/.exec(color)
  if (hexAlpha) {
    color = '#' + hexAlpha[1]
    opacity = parseInt(hexAlpha[2]!, 16) / 255
  }
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: blur,
    elevation: Math.max(1, Math.round(blur / 2)), // Android approximation
  }
}

/**
 * Translate one agnostic style object into an RN style record.
 *
 *   paddingX: 10         → paddingHorizontal: 10
 *   paddingY: 6          → paddingVertical: 6
 *   borderRadius: 4      → borderRadius: 4 (passthrough)
 *   background: "#111"   → backgroundColor: "#111" (RN uses backgroundColor)
 */
function translateOne(obj: AgnosticStyleObject): RNStyle {
  const out: RNStyle = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    if (RN_DROP.has(key)) continue

    // Arrays are CSS fallback chains. RN doesn't understand them; pick
    // the last value as the most-preferred.
    const v = Array.isArray(value) ? value[value.length - 1]! : value
    if (typeof v === 'boolean') continue // RN styles don't take booleans.

    switch (key) {
      case 'position':
        // RN supports only "absolute" and "relative" (and "static" in newer
        // RN). Web's "fixed" / "sticky" have no native equivalent; collapse
        // to "absolute" — the positioner's anchor math already happens in
        // window-space.
        out.position = v === 'fixed' || v === 'sticky' ? 'absolute' : v
        continue
      case 'paddingX':
        out.paddingHorizontal = stripPx(v as string | number)
        continue
      case 'paddingY':
        out.paddingVertical = stripPx(v as string | number)
        continue
      case 'marginX':
        out.marginHorizontal = stripPx(v as string | number)
        continue
      case 'marginY':
        out.marginVertical = stripPx(v as string | number)
        continue
      case 'background':
        out.backgroundColor = v as string | number
        continue
      case 'padding': {
        const expanded = expandShorthand(v as string | number, {
          vertical: 'paddingVertical',
          horizontal: 'paddingHorizontal',
        })
        if (expanded) Object.assign(out, expanded)
        else out.padding = stripPx(v as string | number)
        continue
      }
      case 'margin': {
        const expanded = expandShorthand(v as string | number, {
          vertical: 'marginVertical',
          horizontal: 'marginHorizontal',
        })
        if (expanded) Object.assign(out, expanded)
        else out.margin = stripPx(v as string | number)
        continue
      }
      case 'boxShadow': {
        const shadow = typeof v === 'string' ? expandBoxShadow(v) : null
        if (shadow) Object.assign(out, shadow)
        // Unparseable boxShadow: drop silently — better than passing a web
        // CSS string RN would warn about.
        continue
      }
      case 'lineHeight':
      case 'fontSize':
      case 'borderRadius':
      case 'width':
      case 'height':
      case 'minWidth':
      case 'maxWidth':
      case 'minHeight':
      case 'maxHeight':
        out[key] = stripPx(v as string | number)
        continue
      default:
        out[key] = v as string | number
    }
  }
  return out
}

export interface TranslatedNativeStyle {
  base: RNStyle
  variants: Record<string, Record<string, RNStyle>>
  compoundVariants: Array<Record<string, unknown> & { style: RNStyle }>
  defaultVariants: Record<string, string | boolean>
}

export function translateAgnosticSpecToNative(spec: AgnosticStyleSpec): TranslatedNativeStyle {
  const baseProps: AgnosticStyleObject = {}
  for (const [k, v] of Object.entries(spec)) {
    if (RESERVED_SPEC_KEYS.has(k)) continue
    ;(baseProps as Record<string, unknown>)[k] = v
  }

  const variants: Record<string, Record<string, RNStyle>> = {}
  for (const [name, options] of Object.entries(spec.variants ?? {})) {
    variants[name] = {}
    for (const [optName, optObj] of Object.entries(options)) {
      variants[name][optName] = translateOne(optObj)
    }
  }

  const compoundVariants = (spec.compoundVariants ?? []).map(entry => {
    const { css, ...rest } = entry
    return { ...rest, style: translateOne(css) }
  })

  return {
    base: translateOne(baseProps),
    variants,
    compoundVariants,
    defaultVariants: spec.defaultVariants ?? {},
  }
}

/**
 * Pick the active variant styles and merge with base. The runtime form
 * of "resolve this styled spec for these prop values" — used by the
 * generated elements.ts at render time.
 *
 *   resolveStyle(content, { side: 'top' })
 *     → { ...base, ...variants.side.top, ...(any matching compoundVariants) }
 */
/** Coerce a variant prop value into the string key used in the spec. */
const slot = (v: unknown): string => (typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v))

export function resolveStyle(
  translated: TranslatedNativeStyle,
  selections: Record<string, unknown> = {},
): RNStyle {
  const { base, variants, compoundVariants, defaultVariants } = translated
  const resolved: RNStyle = { ...base }

  // Variants: apply each selected option (or default).
  for (const [variantName, options] of Object.entries(variants)) {
    const selected = slot(selections[variantName] ?? defaultVariants[variantName])
    if (selected && options[selected]) {
      Object.assign(resolved, options[selected])
    }
  }

  // Compound variants: apply if every key matches the current selection
  // (including defaults).
  for (const compound of compoundVariants) {
    const { style, ...keys } = compound
    const matches = Object.entries(keys).every(([k, expected]) => {
      const current = slot(selections[k] ?? defaultVariants[k])
      return current === slot(expected)
    })
    if (matches) Object.assign(resolved, style)
  }

  return resolved
}
