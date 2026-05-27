/**
 * Component codegen.
 *
 * For each component under packages/core/components/<slug>/, regenerate
 * the elements.ts + api.ts files in each adapter (React, native)
 * that exists for that component.
 *
 * Hand-written files in each adapter:
 *   - <Component>.tsx     — the actual view
 *   - context.ts          — adapter-specific context/provider
 *   - utils.ts            — component-local helpers (when needed)
 *   - index.ts            — public reexports
 *
 * Generated files (overwritten on every run, marked with a header):
 *   - elements.ts         — one styled wrapper or style record per *Style spec
 *   - api.ts              — useXxxApi (wires the machine to the adapter)
 *
 * Convention contract:
 *   - core folder name = component slug (kebab-case): "tooltip" / "dropdown-menu"
 *   - core/components/<slug>/src/styles.ts exports each element as a camelCase
 *     const whose value is a style spec (object with `variants`). The
 *     element name on adapters is the PascalCase form: `content` → `Content`.
 *   - core/components/<slug>/src/index.ts exports `<camel>Machine` and
 *     `connect<Pascal>`.
 *
 * No AST parsing — core packages import as ESM modules.
 */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { translateAgnosticSpec } from "@render-experiment/style-engine-react";
import { translateAgnosticSpecToNative } from "@render-experiment/style-engine-native";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const COMPONENTS_CORE = resolve(REPO_ROOT, "packages/core/components");
const COMPONENTS_REACT = resolve(REPO_ROOT, "packages/react/components");
const COMPONENTS_NATIVE = resolve(REPO_ROOT, "packages/native/components");

// -----------------------------------------------------------------------------
// Discovery
// -----------------------------------------------------------------------------

export interface DiscoveredComponent {
  /** Kebab-case folder name: "tooltip" / "dropdown-menu". */
  slug: string;
  /** camelCase form, used as the export-name prefix on adapters. */
  camel: string;
  /** PascalCase, used as the React/RN component name. */
  pascal: string;
  /** Path to core's src dir. */
  coreSrc: string;
  /** Path to react adapter's src dir (may not exist). */
  reactSrc: string;
  /** Path to native adapter's src dir (may not exist). */
  nativeSrc: string;
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

export function discoverComponents(): DiscoveredComponent[] {
  return readdirSync(COMPONENTS_CORE)
    .filter((name) => {
      const full = resolve(COMPONENTS_CORE, name);
      if (!statSync(full).isDirectory()) return false;
      return existsSync(resolve(full, "src"));
    })
    .map((slug) => ({
      slug,
      camel: camelize(slug),
      pascal: pascalize(slug),
      coreSrc: resolve(COMPONENTS_CORE, slug, "src"),
      reactSrc: resolve(COMPONENTS_REACT, slug, "src"),
      nativeSrc: resolve(COMPONENTS_NATIVE, slug, "src"),
    }));
}

// -----------------------------------------------------------------------------
// Reading core specs
// -----------------------------------------------------------------------------

interface LoadedCore {
  /** Element name (PascalCase) → style spec. */
  styles: Record<string, unknown>;
  /** All exports from core's index.ts. */
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

  // Cache-bust dynamic imports so the watcher sees fresh content on
  // re-runs. ESM caches by URL; appending a unique query forces a reload.
  const bust = `?t=${Date.now()}`;
  const stylesMod = (await import(pathToFileURL(stylesPath).href + bust)) as Record<
    string,
    unknown
  >;
  const indexMod = (await import(pathToFileURL(indexPath).href + bust)) as Record<
    string,
    unknown
  >;

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

  const machineKey = `${component.camel}Machine`;
  const connectKey = `connect${component.pascal}`;
  if (!(machineKey in indexMod)) {
    throw new Error(`[${component.slug}] core/index.ts missing export ${machineKey}`);
  }
  if (!(connectKey in indexMod)) {
    throw new Error(`[${component.slug}] core/index.ts missing export ${connectKey}`);
  }

  return { styles, exports: indexMod };
}

// -----------------------------------------------------------------------------
// Emission — shared header
// -----------------------------------------------------------------------------

const HEADER = `/* eslint-disable */
// AUTO-GENERATED by scripts/build.ts — do not edit by hand.
// To change this file, edit the core spec it derives from and rerun \`pnpm codegen\`.
`;

// -----------------------------------------------------------------------------
// React DOM emitters
// -----------------------------------------------------------------------------

function emitReactElements(component: DiscoveredComponent, styles: Record<string, unknown>): string {
  const decls = Object.entries(styles)
    .map(([elementName, spec]) => {
      const camel = elementName[0]!.toLowerCase() + elementName.slice(1);
      const translated = translateAgnosticSpec(spec as never);
      const inlined = JSON.stringify(translated, null, 2);
      return `// Source: core/components/${component.slug}/src/styles.ts → ${camel}
export const ${elementName} = styled(
  "div",
  ${inlined} as any,
);`;
    })
    .join("\n\n");

  return `${HEADER}
import { styled } from "@render-experiment/style-engine-react";

${decls}
`;
}

function emitReactApi(component: DiscoveredComponent): string {
  const { pascal, slug, camel } = component;
  return `${HEADER}
import { withAdapter } from "@render-experiment/machine-core";
import { useMachine } from "@render-experiment/machine-react";
import {
  connect${pascal},
  ${camel}Machine,
  type ${pascal}Api,
  type ${pascal}Context as ${pascal}MachineContext,
  type ${pascal}Props,
  type ${pascal}State,
} from "@render-experiment/${slug}-core";
import { ${camel}Adapter } from "./adapter";

const ${camel}MachineWithAdapter = withAdapter(${camel}Machine, ${camel}Adapter);

/** Wire the core machine to React and return the connect() API. */
export function use${pascal}Api(props: ${pascal}Props): ${pascal}Api {
  const machine = useMachine<${pascal}MachineContext, ${pascal}Props>(
    ${camel}MachineWithAdapter,
    props,
  );
  return connect${pascal}(
    machine.getState() as ${pascal}State,
    machine.getContext(),
    machine.getProps(),
    machine.send,
  );
}
`;
}

// -----------------------------------------------------------------------------
// Native emitters
// -----------------------------------------------------------------------------

function emitNativeElements(component: DiscoveredComponent, styles: Record<string, unknown>): string {
  // Emit each element as a TranslatedNativeStyle literal + a `resolveX()`
  // helper that the view calls with current variant selections.
  const decls: string[] = [];
  for (const [elementName, spec] of Object.entries(styles)) {
    const camel = elementName[0]!.toLowerCase() + elementName.slice(1);
    const translated = translateAgnosticSpecToNative(spec as never);
    const inlined = JSON.stringify(translated, null, 2);
    decls.push(
      `// Source: core/components/${component.slug}/src/styles.ts → ${camel}
export const ${camel}: TranslatedNativeStyle = ${inlined};

export function resolve${elementName}(selections: Record<string, string> = {}) {
  return resolveStyle(${camel}, selections);
}`,
    );
  }

  return `${HEADER}
import { resolveStyle, type TranslatedNativeStyle } from "@render-experiment/style-engine-native";

${decls.join("\n\n")}
`;
}

function emitNativeApi(component: DiscoveredComponent): string {
  const { pascal, slug, camel } = component;
  return `${HEADER}
import { withAdapter } from "@render-experiment/machine-core";
import { useMachine } from "@render-experiment/machine-native";
import {
  connect${pascal},
  ${camel}Machine,
  type ${pascal}Api,
  type ${pascal}Context as ${pascal}MachineContext,
  type ${pascal}Props,
  type ${pascal}State,
} from "@render-experiment/${slug}-core";
import { ${camel}Adapter } from "./adapter";

const ${camel}MachineWithAdapter = withAdapter(${camel}Machine, ${camel}Adapter);

/** Wire the core machine to native and return the connect() API. */
export function use${pascal}Api(props: ${pascal}Props): ${pascal}Api {
  const machine = useMachine<${pascal}MachineContext, ${pascal}Props>(
    ${camel}MachineWithAdapter,
    props,
  );
  return connect${pascal}(
    machine.getState() as ${pascal}State,
    machine.getContext(),
    machine.getProps(),
    machine.send,
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

export async function buildComponent(component: DiscoveredComponent) {
  const core = await loadCore(component);
  const targets: string[] = [];

  if (existsSync(component.reactSrc)) {
    writeFile(
      resolve(component.reactSrc, "elements.ts"),
      emitReactElements(component, core.styles),
    );
    writeFile(resolve(component.reactSrc, "api.ts"), emitReactApi(component));
    targets.push("react");
  }

  if (existsSync(component.nativeSrc)) {
    writeFile(
      resolve(component.nativeSrc, "elements.ts"),
      emitNativeElements(component, core.styles),
    );
    writeFile(
      resolve(component.nativeSrc, "api.ts"),
      emitNativeApi(component),
    );
    targets.push("native");
  }

  if (targets.length === 0) {
    console.warn(
      `[${component.pascal}] no adapters found; skipping`,
    );
    return;
  }

  const elementCount = Object.keys(core.styles).length;
  console.log(
    `[${component.pascal}] generated elements (${elementCount}) + api → ${targets.join(", ")}`,
  );
}

export async function buildAll() {
  const components = discoverComponents();
  if (components.length === 0) {
    console.warn("No components found under packages/core/components/*.");
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

// Run as CLI when invoked directly (not imported). tsx invokes this file
// with the same URL as the script, so import.meta.url comparison works.
const isCli = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isCli) {
  await buildAll();
}
