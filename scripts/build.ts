/**
 * Component codegen.
 *
 * For each component under packages/components/core/<slug>/, regenerate
 * the React adapter's `elements.ts` (styled wrappers from the agnostic
 * style specs) and `api.ts` (the React-side useXxxApi hook).
 *
 * Hand-written files in the React adapter:
 *   - <Component>.tsx — the actual view
 *   - context.ts      — React context + useXxxCtx
 *   - utils.ts        — component-local helpers
 *   - index.ts        — public reexports
 *
 * Generated files (overwritten on every run, marked with a header):
 *   - elements.ts     — one styled() per *Style spec from core
 *   - api.ts          — useXxxApi (wires behavior to React)
 *
 * Convention contract:
 *   - core folder name = component slug (kebab-case): "tooltip" / "dropdown-menu"
 *   - core/<slug>/src/styles.ts exports each element as a camelCase const
 *     whose value is a style spec (object with `variants`). The element
 *     name on the React side is the PascalCase form: `content` → `Content`.
 *   - core/<slug>/src/index.ts exports `<camel>Behavior` (config) and
 *     `connect<Pascal>` (connect function).
 *
 * No AST parsing — core packages import as ESM modules.
 */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { translateAgnosticSpec } from "@render-experiment/style-react";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const COMPONENTS_CORE = resolve(REPO_ROOT, "packages/core/components");
const COMPONENTS_REACT = resolve(REPO_ROOT, "packages/react/components");

// -----------------------------------------------------------------------------
// Discovery
// -----------------------------------------------------------------------------

interface DiscoveredComponent {
  /** Kebab-case folder name: "tooltip" / "dropdown-menu". */
  slug: string;
  /** camelCase form, used as the export-name prefix on the React side. */
  camel: string;
  /** PascalCase, used as the React component name. */
  pascal: string;
  /** Path to core's src dir. */
  coreSrc: string;
  /** Path to react adapter's src dir. */
  reactSrc: string;
}

function pascalize(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((s) => s[0]!.toUpperCase() + s.slice(1))
    .join("");
}

function camelize(slug: string): string {
  const parts = slug.split(/[-_]/);
  return (
    parts[0]! +
    parts
      .slice(1)
      .map((s) => s[0]!.toUpperCase() + s.slice(1))
      .join("")
  );
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

function discoverComponents(): DiscoveredComponent[] {
  return readdirSync(COMPONENTS_CORE)
    .filter((name) => {
      const full = resolve(COMPONENTS_CORE, name);
      if (!statSync(full).isDirectory()) return false;
      // Skip empty/stale folders that don't have src/ (e.g. leftovers
      // from previous experiments).
      return existsSync(resolve(full, "src"));
    })
    .map((slug) => ({
      slug,
      camel: camelize(slug),
      pascal: pascalize(slug),
      coreSrc: resolve(COMPONENTS_CORE, slug, "src"),
      reactSrc: resolve(COMPONENTS_REACT, slug, "src"),
    }));
}

// -----------------------------------------------------------------------------
// Reading core specs
// -----------------------------------------------------------------------------

interface LoadedCore {
  /** Element name (PascalCase) → style spec. */
  styles: Record<string, unknown>;
  /** All exports from core's index.ts. Used to verify behavior + connect. */
  exports: Record<string, unknown>;
}

function isStyleSpec(value: unknown): boolean {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "variants" in (value as object)
  );
}

async function loadCore(component: DiscoveredComponent): Promise<LoadedCore> {
  const stylesPath = resolve(component.coreSrc, "styles.ts");
  const indexPath = resolve(component.coreSrc, "index.ts");

  const stylesMod = (await import(pathToFileURL(stylesPath).href)) as Record<
    string,
    unknown
  >;
  const indexMod = (await import(pathToFileURL(indexPath).href)) as Record<
    string,
    unknown
  >;

  // Pick up every camelCase export whose value looks like a style spec.
  // Element name on the React side is the PascalCase form of the export.
  const styles: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(stylesMod)) {
    if (!isStyleSpec(value)) continue;
    styles[capitalize(key)] = value;
  }

  if (Object.keys(styles).length === 0) {
    throw new Error(
      `[${component.slug}] No style-spec exports found in core's styles.ts (need objects with a \`variants\` field).`,
    );
  }

  // Verify required behavior exports exist.
  const behaviorKey = `${component.camel}Behavior`;
  const connectKey = `connect${component.pascal}`;
  if (!(behaviorKey in indexMod)) {
    throw new Error(`[${component.slug}] core/index.ts missing export ${behaviorKey}`);
  }
  if (!(connectKey in indexMod)) {
    throw new Error(`[${component.slug}] core/index.ts missing export ${connectKey}`);
  }

  return { styles, exports: indexMod };
}

// -----------------------------------------------------------------------------
// Emission
// -----------------------------------------------------------------------------

const HEADER = `/* eslint-disable */
// AUTO-GENERATED by scripts/build.ts — do not edit by hand.
// To change this file, edit the core spec it derives from and rerun \`pnpm codegen\`.
`;

function emitElements(component: DiscoveredComponent, styles: Record<string, unknown>): string {
  const decls = Object.entries(styles)
    .map(([elementName, spec]) => {
      const camel = elementName[0]!.toLowerCase() + elementName.slice(1);
      const translated = translateAgnosticSpec(spec as never);
      // JSON.stringify is safe — translated values are strings/numbers + a
      // nested variants object; no functions, no symbols.
      const inlined = JSON.stringify(translated, null, 2);
      return `// Source: core/${component.slug}/src/styles.ts → ${camel}
export const ${elementName} = styled(
  "div",
  ${inlined} as any,
);`;
    })
    .join("\n\n");

  return `${HEADER}
import { styled } from "@render-experiment/style-react";

${decls}
`;
}

function emitApi(component: DiscoveredComponent): string {
  const { pascal, slug, camel } = component;
  return `${HEADER}
import { useBehavior } from "@render-experiment/behavior-react";
import {
  connect${pascal},
  ${camel}Behavior,
  type ${pascal}Api,
  type ${pascal}Context as ${pascal}BehaviorContext,
  type ${pascal}Props,
  type ${pascal}State,
} from "@render-experiment/${slug}-core";

/** Wire the core behavior to React and return the connect() API. */
export function use${pascal}Api(props: ${pascal}Props): ${pascal}Api {
  const behavior = useBehavior<${pascal}BehaviorContext, ${pascal}Props>(
    ${camel}Behavior,
    props,
  );
  return connect${pascal}(
    behavior.getState() as ${pascal}State,
    behavior.getContext(),
    behavior.getProps(),
    behavior.send,
  );
}
`;
}

// -----------------------------------------------------------------------------
// Orchestration
// -----------------------------------------------------------------------------

function writeFile(filepath: string, contents: string) {
  mkdirSync(dirname(filepath), { recursive: true });
  writeFileSync(filepath, contents);
}

async function buildComponent(component: DiscoveredComponent) {
  if (!existsSync(component.reactSrc)) {
    console.warn(
      `[${component.pascal}] no react adapter at ${component.reactSrc}; skipping`,
    );
    return;
  }

  const core = await loadCore(component);
  writeFile(resolve(component.reactSrc, "elements.ts"), emitElements(component, core.styles));
  writeFile(resolve(component.reactSrc, "api.ts"), emitApi(component));

  const elementCount = Object.keys(core.styles).length;
  console.log(`[${component.pascal}] generated elements.ts (${elementCount}) + api.ts`);
}

async function main() {
  const components = discoverComponents();
  if (components.length === 0) {
    console.warn("No components found under packages/components/core/*.");
    return;
  }
  for (const c of components) {
    try {
      await buildComponent(c);
    } catch (e) {
      console.error(`[${c.pascal}] failed: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }
}

await main();
