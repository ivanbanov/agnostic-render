/**
 * Style engine — Stitches placeholder + agnostic-spec translator.
 *
 * `stitches` / `styled` / `css` are the runtime engine (stand-in for the
 * future @style-dsl React target).
 *
 * `translateAgnosticSpec()` is the bridge: takes a renderer-blind style spec
 * (the kind components publish from their core package) and returns a
 * Stitches-shaped config. This is where the logical → CSS dictionary lives.
 */
import { createStitches } from '@stitches/react'

export const stitches = createStitches()

export const { styled, css, keyframes, globalCss, getCssText, theme, config } = stitches

// -----------------------------------------------------------------------------
// Agnostic-spec translator
// -----------------------------------------------------------------------------

type StyleValue = string | number | boolean

interface AgnosticStyleObject {
  paddingX?: StyleValue
  paddingY?: StyleValue
  [k: string]: StyleValue | StyleValue[] | undefined
}

// Flat-spec shape: base style props live at the top level alongside variants.
// Reserved structural keys are pulled out by the translator; everything else
// is treated as a style prop. Loose index signature so authors can pass any
// CSS-name prop without TS complaining.
interface AgnosticStyleSpec {
  variants?: Record<string, Record<string, AgnosticStyleObject>>
  compoundVariants?: Array<Record<string, unknown> & { css: AgnosticStyleObject }>
  defaultVariants?: Record<string, string>
  [prop: string]: unknown
}

type CSSRecord = Record<string, string | number>

const RESERVED_SPEC_KEYS = new Set(['variants', 'compoundVariants', 'defaultVariants'])

/**
 * Translate one agnostic style object into a CSS-shaped record.
 *
 *   paddingX: 10               → paddingLeft + paddingRight
 *   paddingY: 6                → paddingTop + paddingBottom
 *   anything else              → passed through unchanged
 */
function translateOne(obj: AgnosticStyleObject): CSSRecord {
  const out: CSSRecord = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue

    if (key === 'paddingX') {
      const v = value as string | number
      out.paddingLeft = v
      out.paddingRight = v
      continue
    }
    if (key === 'paddingY') {
      const v = value as string | number
      out.paddingTop = v
      out.paddingBottom = v
      continue
    }

    // Anything left should be a CSS-name property. Coerce non-string/number
    // values (booleans, arrays) to strings so Stitches accepts them.
    if (typeof value === 'string' || typeof value === 'number') {
      out[key] = value
    } else {
      out[key] = String(value)
    }
  }
  return out
}

/**
 * Translate a full agnostic style spec into a Stitches-shaped config.
 *
 *   { ...flatBase, variants, compoundVariants, defaultVariants }
 *     → { ...flatBaseTranslated, variants, compoundVariants, defaultVariants }
 *
 * The reserved keys (variants/compoundVariants/defaultVariants) are pulled
 * out; everything else is translated as a base style prop.
 */
export function translateAgnosticSpec(spec: AgnosticStyleSpec) {
  // Split spec into the structural reserved keys vs. the flat base props.
  const baseProps: AgnosticStyleObject = {}
  for (const [key, value] of Object.entries(spec)) {
    if (RESERVED_SPEC_KEYS.has(key)) continue
    ;(baseProps as Record<string, unknown>)[key] = value
  }

  const base = translateOne(baseProps)
  const variants: Record<string, Record<string, CSSRecord>> = {}
  for (const [variantName, options] of Object.entries(spec.variants ?? {})) {
    variants[variantName] = {}
    for (const [optionName, optionObj] of Object.entries(options)) {
      variants[variantName][optionName] = translateOne(optionObj)
    }
  }
  const compoundVariants = (spec.compoundVariants ?? []).map(entry => {
    const { css: cssObj, ...rest } = entry
    return { ...rest, css: translateOne(cssObj) }
  })
  return {
    ...base,
    variants,
    compoundVariants,
    defaultVariants: spec.defaultVariants ?? {},
  }
}
