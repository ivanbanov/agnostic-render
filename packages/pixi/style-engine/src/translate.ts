/**
 * Translate an agnostic style spec (paint-only, CSS-name properties) into
 * a Pixi-flat style record.
 *
 * The codegen calls this at build time and inlines the result as a JSON
 * literal into each elements.ts file. At runtime, styled() consumes that
 * literal — no parsing, no string manipulation, just lookups.
 *
 * Transformations:
 *   - `background: "#111"`  → `background: 0x111111`  (Pixi expects numeric color)
 *   - `color: "#fff"`        → `color: 0xffffff`
 *   - `paddingX: 10`        → kept as-is (the styled() factory applies it)
 *   - `paddingY: 6`         → kept as-is
 *   - `borderRadius: 4`     → kept as-is
 *   - `fontSize: 13`        → kept as-is
 *   - `marginX/Y`           → kept as-is (used by stack-style layouts)
 *
 * Anything else passes through unchanged. Pixi-only fields the consumer
 * adds directly to the spec (no CSS equivalent) get preserved verbatim.
 */

type StyleValue = string | number | boolean

interface AgnosticStyleObject {
  [k: string]: StyleValue | StyleValue[] | undefined
}

interface AgnosticStyleSpec {
  variants?: Record<string, Record<string, AgnosticStyleObject>>
  compoundVariants?: Array<Record<string, unknown> & { css: AgnosticStyleObject }>
  defaultVariants?: Record<string, string | boolean>
  [prop: string]: unknown
}

type PixiValue = string | number | boolean

export interface PixiStyleRecord {
  [prop: string]: PixiValue | PixiValue[]
}

export type PixiCompoundVariant = {
  [k: string]: string | PixiStyleRecord
} & { css: PixiStyleRecord }

export interface PixiStyleSpec {
  base: PixiStyleRecord
  variants: Record<string, Record<string, PixiStyleRecord>>
  compoundVariants: PixiCompoundVariant[]
  defaultVariants: Record<string, string | boolean>
}

const RESERVED = new Set(['variants', 'compoundVariants', 'defaultVariants'])

// CSS color → Pixi numeric. Accepts "#rgb", "#rrggbb", "transparent". Anything
// else is left as a string for the styled factory to ignore.
function parseColor(value: string): number | string {
  if (value === 'transparent') return 0x000000 // alpha handled separately
  if (!value.startsWith('#')) return value
  let hex = value.slice(1)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('')
  }
  if (hex.length !== 6) return value
  const n = parseInt(hex, 16)
  return Number.isNaN(n) ? value : n
}

const COLOR_KEYS = new Set(['background', 'color', 'borderColor', 'fill', 'stroke'])

function translateValue(key: string, value: PixiValue): PixiValue {
  if (typeof value === 'string' && COLOR_KEYS.has(key)) {
    return parseColor(value)
  }
  return value
}

function translateOne(obj: AgnosticStyleObject): PixiStyleRecord {
  const out: PixiStyleRecord = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      out[key] = value.map(v => translateValue(key, v as PixiValue))
      continue
    }
    out[key] = translateValue(key, value)
  }
  return out
}

export function translateAgnosticSpecToPixi(spec: AgnosticStyleSpec): PixiStyleSpec {
  const base: AgnosticStyleObject = {}
  for (const [key, value] of Object.entries(spec)) {
    if (RESERVED.has(key)) continue
    base[key] = value as AgnosticStyleObject[string]
  }

  const variants: Record<string, Record<string, PixiStyleRecord>> = {}
  for (const [name, options] of Object.entries(spec.variants ?? {})) {
    variants[name] = {}
    for (const [option, obj] of Object.entries(options)) {
      variants[name][option] = translateOne(obj)
    }
  }

  const compoundVariants: PixiCompoundVariant[] = (spec.compoundVariants ?? []).map(entry => {
    const { css: cssObj, ...rest } = entry
    return {
      ...(rest as Record<string, string>),
      css: translateOne(cssObj),
    }
  })

  return {
    base: translateOne(base),
    variants,
    compoundVariants,
    defaultVariants: spec.defaultVariants ?? {},
  }
}
