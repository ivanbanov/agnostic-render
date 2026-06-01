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
 * Generated files (overwritten on every run, marked with a header,
 * live under each adapter's `src/generated/`):
 *   - generated/elements.ts  — one styled wrapper or style record per *Style spec
 *   - generated/api.ts       — useXxxApi (wires the machine to the adapter)
 *
 * Convention contract:
 *   - core folder name = component slug (kebab-case): "tooltip" / "dropdown-menu"
 *   - shared/components/<slug>/src/styles.ts exports each part as a
 *     camelCase const whose value is a style spec (object with `variants`).
 *     The part name on adapters is the PascalCase form: `content` → `Content`.
 *   - core/components/<slug>/src/parts/<name>.ts holds the matching variant
 *     types (the contract). Codegen does not read these.
 *   - core/components/<slug>/src/index.ts exports `<camel>Machine` and
 *     `connect<Pascal>`.
 *
 * No AST parsing — core packages import as ESM modules.
 */
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { translateAgnosticSpec } from '@render-experiment/style-engine-react'
import { translateAgnosticSpecToNative } from '@render-experiment/style-engine-native'
import { translateAgnosticSpecToPixi } from '@render-experiment/style-engine-pixi'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
const COMPONENTS_CORE = resolve(REPO_ROOT, 'packages/core/components')
const COMPONENTS_REACT = resolve(REPO_ROOT, 'packages/react/components')
const COMPONENTS_NATIVE = resolve(REPO_ROOT, 'packages/native/components')
const COMPONENTS_PIXI = resolve(REPO_ROOT, 'packages/pixi/components')
const COMPONENTS_SHARED = resolve(REPO_ROOT, 'packages/shared/components')

// -----------------------------------------------------------------------------
// Discovery
// -----------------------------------------------------------------------------

export interface DiscoveredComponent {
  /** Kebab-case folder name: "tooltip" / "dropdown-menu". */
  slug: string
  /** camelCase form, used as the export-name prefix on adapters. */
  camel: string
  /** PascalCase, used as the React/RN component name. */
  pascal: string
  /** Path to core's src dir. */
  coreSrc: string
  /** Path to the shared package's src dir (hosts style specs). */
  sharedSrc: string
  /** Path to react adapter's src dir (may not exist). */
  reactSrc: string
  /** Path to native adapter's src dir (may not exist). */
  nativeSrc: string
  /** Path to pixi adapter's src dir (may not exist). */
  pixiSrc: string
}

function pascalize(slug: string): string {
  return slug
    .split(/[-_]/)
    .map(s => s[0]!.toUpperCase() + s.slice(1))
    .join('')
}

function camelize(slug: string): string {
  const parts = slug.split(/[-_]/)
  return (
    parts[0]! +
    parts
      .slice(1)
      .map(s => s[0]!.toUpperCase() + s.slice(1))
      .join('')
  )
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1)
}

export function discoverComponents(): DiscoveredComponent[] {
  return readdirSync(COMPONENTS_CORE)
    .filter(name => {
      const full = resolve(COMPONENTS_CORE, name)
      if (!statSync(full).isDirectory()) return false
      return existsSync(resolve(full, 'src'))
    })
    .map(slug => ({
      slug,
      camel: camelize(slug),
      pascal: pascalize(slug),
      coreSrc: resolve(COMPONENTS_CORE, slug, 'src'),
      sharedSrc: resolve(COMPONENTS_SHARED, slug, 'src'),
      reactSrc: resolve(COMPONENTS_REACT, slug, 'src'),
      nativeSrc: resolve(COMPONENTS_NATIVE, slug, 'src'),
      pixiSrc: resolve(COMPONENTS_PIXI, slug, 'src'),
    }))
}

// -----------------------------------------------------------------------------
// Reading core specs
// -----------------------------------------------------------------------------

interface LoadedCore {
  /** Element name (PascalCase) → style spec. */
  styles: Record<string, unknown>
  /** All exports from core's index.ts. */
  exports: Record<string, unknown>
}

function isStyleSpec(value: unknown): boolean {
  return (
    !!value && typeof value === 'object' && !Array.isArray(value) && 'variants' in (value as object)
  )
}

async function loadCore(component: DiscoveredComponent): Promise<LoadedCore> {
  const stylesPath = resolve(component.sharedSrc, 'styles.ts')
  const indexPath = resolve(component.coreSrc, 'index.ts')

  // Cache-bust dynamic imports so the watcher sees fresh content on
  // re-runs. ESM caches by URL; appending a unique query forces a reload.
  const bust = `?t=${Date.now()}`
  const stylesMod = (await import(pathToFileURL(stylesPath).href + bust)) as Record<string, unknown>
  const indexMod = (await import(pathToFileURL(indexPath).href + bust)) as Record<string, unknown>

  // Pick up every camelCase export from the shared styles.ts whose
  // value looks like a style spec. The part name on adapters is the
  // PascalCase form.
  const styles: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(stylesMod)) {
    if (!isStyleSpec(value)) continue
    styles[capitalize(key)] = value
  }

  if (Object.keys(styles).length === 0) {
    throw new Error(
      `[${component.slug}] No style-spec exports found in packages/shared/components/${component.slug}/src/styles.ts (each part should export a const with a \`variants\` field).`,
    )
  }

  const machineKey = `${component.camel}Machine`
  const connectKey = `connect${component.pascal}`
  if (!(machineKey in indexMod)) {
    throw new Error(`[${component.slug}] core/index.ts missing export ${machineKey}`)
  }
  if (!(connectKey in indexMod)) {
    throw new Error(`[${component.slug}] core/index.ts missing export ${connectKey}`)
  }

  return { styles, exports: indexMod }
}

// -----------------------------------------------------------------------------
// Emission — shared header
// -----------------------------------------------------------------------------

const ESLINT_DISABLE = `/* eslint-disable */`

// -----------------------------------------------------------------------------
// React DOM emitters
// -----------------------------------------------------------------------------

function emitReactElements(
  component: DiscoveredComponent,
  styles: Record<string, unknown>,
): string {
  const decls = Object.entries(styles)
    .map(([elementName, spec]) => {
      const camel = elementName[0]!.toLowerCase() + elementName.slice(1)
      const translated = translateAgnosticSpec(spec as never)
      const inlined = JSON.stringify(translated, null, 2)
      return `// Source: shared/components/${component.slug}/src/styles → ${camel}
export const ${elementName} = styled(
  "div",
  ${inlined} as any,
);`
    })
    .join('\n\n')

  return `${ESLINT_DISABLE}
import { styled } from "@render-experiment/style-engine-react";

${decls}
`
}

function emitReactApi(component: DiscoveredComponent): string {
  const { pascal, slug, camel } = component
  return `${ESLINT_DISABLE}
import { withAdapter } from "@render-experiment/machine-core";
import { useApi } from "@render-experiment/machine-react";
import {
  connect${pascal},
  ${camel}Machine,
  type ${pascal}Api,
  type ${pascal}Context as ${pascal}MachineContext,
  type ${pascal}Props,
  type ${pascal}State,
} from "@render-experiment/${slug}-core";
import { ${camel}Adapter } from "../adapter";

const ${camel}MachineWithAdapter = withAdapter(${camel}Machine, ${camel}Adapter);

/** Wire the core machine to React and return the connect() API. */
export function use${pascal}Api(props: ${pascal}Props): ${pascal}Api {
  return useApi<${pascal}MachineContext, ${pascal}Props, ${pascal}State, ${pascal}Api>(
    ${camel}MachineWithAdapter,
    props,
    connect${pascal},
  );
}
`
}

// -----------------------------------------------------------------------------
// Native emitters
// -----------------------------------------------------------------------------

function emitNativeElements(
  component: DiscoveredComponent,
  styles: Record<string, unknown>,
): string {
  // Emit each element as a TranslatedNativeStyle literal + a `resolveX()`
  // helper that the view calls with current variant selections.
  const decls: string[] = []
  for (const [elementName, spec] of Object.entries(styles)) {
    const camel = elementName[0]!.toLowerCase() + elementName.slice(1)
    const translated = translateAgnosticSpecToNative(spec as never)
    const inlined = JSON.stringify(translated, null, 2)
    decls.push(
      `// Source: shared/components/${component.slug}/src/styles → ${camel}
export const ${camel}: TranslatedNativeStyle = ${inlined};

export function resolve${elementName}(selections: Record<string, string | boolean> = {}) {
  return resolveStyle(${camel}, selections);
}`,
    )
  }

  return `${ESLINT_DISABLE}
import { resolveStyle, type TranslatedNativeStyle } from "@render-experiment/style-engine-native";

${decls.join('\n\n')}
`
}

function emitNativeApi(component: DiscoveredComponent): string {
  const { pascal, slug, camel } = component
  return `${ESLINT_DISABLE}
import { withAdapter } from "@render-experiment/machine-core";
import { useApi } from "@render-experiment/machine-native";
import {
  connect${pascal},
  ${camel}Machine,
  type ${pascal}Api,
  type ${pascal}Context as ${pascal}MachineContext,
  type ${pascal}Props,
  type ${pascal}State,
} from "@render-experiment/${slug}-core";
import { ${camel}Adapter } from "../adapter";

const ${camel}MachineWithAdapter = withAdapter(${camel}Machine, ${camel}Adapter);

/** Wire the core machine to native and return the connect() API. */
export function use${pascal}Api(props: ${pascal}Props): ${pascal}Api {
  return useApi<${pascal}MachineContext, ${pascal}Props, ${pascal}State, ${pascal}Api>(
    ${camel}MachineWithAdapter,
    props,
    connect${pascal},
  );
}
`
}

// -----------------------------------------------------------------------------
// Pixi emitters
// -----------------------------------------------------------------------------

/**
 * Pick the Pixi primitive tag for a given element name.
 *
 *   "Positioner"     → "container"  (invisible layout host)
 *   "Label" / "Hotkey" → "text"      (text-only)
 *   anything else    → "graphics"   (background-painted surface)
 *
 * Components can override by exporting a constant `pixiPrimitives` from
 * styles.ts mapping element name → primitive — wired later if needed.
 */
function pixiPrimitiveFor(elementName: string): 'container' | 'graphics' | 'text' {
  if (elementName === 'Positioner' || elementName === 'Group') return 'container'
  if (elementName === 'Label' || elementName === 'Hotkey') return 'text'
  return 'graphics'
}

function emitPixiElements(component: DiscoveredComponent, styles: Record<string, unknown>): string {
  const decls: string[] = []
  for (const [elementName, spec] of Object.entries(styles)) {
    const camel = elementName[0]!.toLowerCase() + elementName.slice(1)
    const primitive = pixiPrimitiveFor(elementName)
    const translated = translateAgnosticSpecToPixi(spec as never)
    const inlined = JSON.stringify(translated, null, 2)
    decls.push(
      `// Source: shared/components/${component.slug}/src/styles → ${camel} (primitive: ${primitive})
export const ${elementName} = styled(${JSON.stringify(primitive)}, ${inlined});`,
    )
  }

  return `${ESLINT_DISABLE}
import { styled } from "@render-experiment/style-engine-pixi";

${decls.join('\n\n')}
`
}

function emitPixiApi(component: DiscoveredComponent): string {
  const { pascal, slug, camel } = component
  return `${ESLINT_DISABLE}
import { withAdapter } from "@render-experiment/machine-core";
import { createRuntime, type Runtime } from "@render-experiment/machine-pixi";
import {
  connect${pascal},
  ${camel}Machine,
  type ${pascal}Api,
  type ${pascal}Context as ${pascal}MachineContext,
  type ${pascal}Props,
  type ${pascal}State,
} from "@render-experiment/${slug}-core";
import { ${camel}Adapter } from "../adapter";

const ${camel}MachineWithAdapter = withAdapter(${camel}Machine, ${camel}Adapter);

/**
 * Pixi version: not a hook (no React). Returns a runtime + a getApi()
 * that's cached by the machine's version counter — calls are cheap as
 * long as nothing has changed.
 */
export type ${pascal}Bridge = Runtime<${pascal}MachineContext, ${pascal}Props, ${pascal}Api>;

export function create${pascal}Bridge(props: ${pascal}Props): ${pascal}Bridge {
  return createRuntime<${pascal}MachineContext, ${pascal}Props, ${pascal}State, ${pascal}Api>(
    ${camel}MachineWithAdapter,
    props,
    connect${pascal},
  );
}
`
}

// -----------------------------------------------------------------------------
// Orchestration
// -----------------------------------------------------------------------------

function writeFile(filepath: string, contents: string) {
  mkdirSync(dirname(filepath), { recursive: true })
  writeFileSync(filepath, contents)
}

export async function buildComponent(component: DiscoveredComponent) {
  const core = await loadCore(component)
  const targets: string[] = []

  if (existsSync(component.reactSrc)) {
    writeFile(
      resolve(component.reactSrc, 'generated/elements.ts'),
      emitReactElements(component, core.styles),
    )
    writeFile(resolve(component.reactSrc, 'generated/api.ts'), emitReactApi(component))
    targets.push('react')
  }

  if (existsSync(component.nativeSrc)) {
    writeFile(
      resolve(component.nativeSrc, 'generated/elements.ts'),
      emitNativeElements(component, core.styles),
    )
    writeFile(resolve(component.nativeSrc, 'generated/api.ts'), emitNativeApi(component))
    targets.push('native')
  }

  if (existsSync(component.pixiSrc)) {
    writeFile(
      resolve(component.pixiSrc, 'generated/elements.ts'),
      emitPixiElements(component, core.styles),
    )
    writeFile(resolve(component.pixiSrc, 'generated/api.ts'), emitPixiApi(component))
    targets.push('pixi')
  }

  if (targets.length === 0) {
    console.warn(`[${component.pascal}] no adapters found; skipping`)
    return
  }

  const elementCount = Object.keys(core.styles).length
  console.log(
    `[${component.pascal}] generated elements (${elementCount}) + api → ${targets.join(', ')}`,
  )
}

export async function buildAll() {
  const components = discoverComponents()
  if (components.length === 0) {
    console.warn('No components found under packages/core/components/*.')
    return
  }
  for (const c of components) {
    try {
      await buildComponent(c)
    } catch (e) {
      console.error(`[${c.pascal}] failed: ${(e as Error).message}`)
      process.exitCode = 1
    }
  }
}

// Run as CLI when invoked directly (not imported). tsx invokes this file
// with the same URL as the script, so import.meta.url comparison works.
const isCli = import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (isCli) {
  await buildAll()
}
