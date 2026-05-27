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
 */

type StyleValue = string | number | boolean;

interface AgnosticStyleObject {
  paddingX?: StyleValue;
  paddingY?: StyleValue;
  marginX?: StyleValue;
  marginY?: StyleValue;
  [k: string]: StyleValue | StyleValue[] | undefined;
}

interface AgnosticStyleSpec {
  variants?: Record<string, Record<string, AgnosticStyleObject>>;
  compoundVariants?: Array<
    Record<string, unknown> & { css: AgnosticStyleObject }
  >;
  defaultVariants?: Record<string, string>;
  [prop: string]: unknown;
}

type RNStyle = Record<string, string | number>;

const RESERVED_SPEC_KEYS = new Set([
  "variants",
  "compoundVariants",
  "defaultVariants",
]);

// Props that have no RN equivalent. Listed explicitly so the translator
// doesn't silently leak them through to a runtime where they'd be ignored.
const RN_DROP = new Set([
  "pointerEvents", // RN has its own pointerEvents prop, not a style.
  "visibility",    // No direct RN analog; consumers should toggle opacity or render conditionally.
  "cursor",        // No-op on mobile.
  "userSelect",    // No-op.
]);

/**
 * Translate one agnostic style object into an RN style record.
 *
 *   paddingX: 10         → paddingHorizontal: 10
 *   paddingY: 6          → paddingVertical: 6
 *   borderRadius: 4      → borderRadius: 4 (passthrough)
 *   background: "#111"   → backgroundColor: "#111" (RN uses backgroundColor)
 */
function translateOne(obj: AgnosticStyleObject): RNStyle {
  const out: RNStyle = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (RN_DROP.has(key)) continue;

    // Arrays are CSS fallback chains. RN doesn't understand them; pick
    // the last value as the most-preferred.
    const v = Array.isArray(value) ? value[value.length - 1]! : value;
    if (typeof v === "boolean") continue; // RN styles don't take booleans.

    switch (key) {
      case "paddingX":
        out.paddingHorizontal = v as string | number;
        continue;
      case "paddingY":
        out.paddingVertical = v as string | number;
        continue;
      case "marginX":
        out.marginHorizontal = v as string | number;
        continue;
      case "marginY":
        out.marginVertical = v as string | number;
        continue;
      case "background":
        out.backgroundColor = v as string | number;
        continue;
      default:
        out[key] = v as string | number;
    }
  }
  return out;
}

export interface TranslatedNativeStyle {
  base: RNStyle;
  variants: Record<string, Record<string, RNStyle>>;
  compoundVariants: Array<Record<string, unknown> & { style: RNStyle }>;
  defaultVariants: Record<string, string>;
}

export function translateAgnosticSpecToNative(
  spec: AgnosticStyleSpec,
): TranslatedNativeStyle {
  const baseProps: AgnosticStyleObject = {};
  for (const [k, v] of Object.entries(spec)) {
    if (RESERVED_SPEC_KEYS.has(k)) continue;
    (baseProps as Record<string, unknown>)[k] = v;
  }

  const variants: Record<string, Record<string, RNStyle>> = {};
  for (const [name, options] of Object.entries(spec.variants ?? {})) {
    variants[name] = {};
    for (const [optName, optObj] of Object.entries(options)) {
      variants[name][optName] = translateOne(optObj);
    }
  }

  const compoundVariants = (spec.compoundVariants ?? []).map((entry) => {
    const { css, ...rest } = entry;
    return { ...rest, style: translateOne(css) };
  });

  return {
    base: translateOne(baseProps),
    variants,
    compoundVariants,
    defaultVariants: spec.defaultVariants ?? {},
  };
}

/**
 * Pick the active variant styles and merge with base. The runtime form
 * of "resolve this styled spec for these prop values" — used by the
 * generated elements.ts at render time.
 *
 *   resolveStyle(content, { side: 'top' })
 *     → { ...base, ...variants.side.top, ...(any matching compoundVariants) }
 */
export function resolveStyle(
  translated: TranslatedNativeStyle,
  selections: Record<string, string> = {},
): RNStyle {
  const { base, variants, compoundVariants, defaultVariants } = translated;
  const resolved: RNStyle = { ...base };

  // Variants: apply each selected option (or default).
  for (const [variantName, options] of Object.entries(variants)) {
    const selected = selections[variantName] ?? defaultVariants[variantName];
    if (selected && options[selected]) {
      Object.assign(resolved, options[selected]);
    }
  }

  // Compound variants: apply if every key matches the current selection
  // (including defaults).
  for (const compound of compoundVariants) {
    const { style, ...keys } = compound;
    const matches = Object.entries(keys).every(([k, expected]) => {
      const current = selections[k] ?? defaultVariants[k];
      return current === expected;
    });
    if (matches) Object.assign(resolved, style);
  }

  return resolved;
}
