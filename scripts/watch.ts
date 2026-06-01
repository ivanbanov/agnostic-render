/**
 * Codegen watcher.
 *
 * Watches every core component's authored files — the per-file machine,
 * types, props, utils, and the elements/ folder — and re-runs the build
 * emitter for the affected component when any of them change.
 *
 * The build script writes elements.ts and api.ts inside each adapter
 * package; Vite (web) and Metro (RN) pick those changes up via their
 * own file watchers and trigger HMR. This watcher's only job is to
 * keep the generated files in sync with the agnostic core.
 */
import { resolve } from 'node:path'
import chokidar from 'chokidar'
import { buildAll, buildComponent, discoverComponents } from './build'

// Files inside each core/components/<slug>/src/ that the codegen reads.
// Plus the elements/ directory watched recursively.
const WATCHED_FILES = ['machine.ts', 'types.ts', 'props.ts', 'utils.ts']
const WATCHED_DIRS = ['elements']

const components = discoverComponents()
if (components.length === 0) {
  console.warn('No components found under packages/core/components/*; nothing to watch.')
  process.exit(0)
}

// Per-component, gather one absolute path prefix (the src/ dir) we use to
// map an event path back to the owning slug.
const srcByPrefix: Array<{ prefix: string; slug: string }> = components.map(c => ({
  prefix: c.coreSrc,
  slug: c.slug,
}))

function slugFor(eventPath: string): string | undefined {
  return srcByPrefix.find(s => eventPath.startsWith(s.prefix))?.slug
}

const watchPaths: string[] = []
for (const c of components) {
  for (const file of WATCHED_FILES) {
    watchPaths.push(resolve(c.coreSrc, file))
  }
  for (const dir of WATCHED_DIRS) {
    watchPaths.push(resolve(c.coreSrc, dir))
  }
}

// Initial build so consumers don't have to also run `pnpm codegen` first.
await buildAll()
console.log(`[watch] ready — watching ${components.length} component(s)`)

// Debounce per slug so a save that touches multiple files batches into
// one rebuild.
// ReturnType<typeof setTimeout> adapts to whichever lib resolves here
// (DOM `number` vs Node `Timeout`) — the tsconfig pulls in "dom".
const pending = new Map<string, ReturnType<typeof setTimeout>>()
function rebuildSlug(slug: string) {
  const existing = pending.get(slug)
  if (existing) clearTimeout(existing)
  pending.set(
    slug,
    setTimeout(async () => {
      pending.delete(slug)
      const component = components.find(c => c.slug === slug)
      if (!component) return
      try {
        await buildComponent(component)
      } catch (e) {
        console.error(`[${component.pascal}] failed: ${(e as Error).message}`)
      }
    }, 50),
  )
}

const watcher = chokidar.watch(watchPaths, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
})

watcher.on('change', path => {
  const slug = slugFor(path)
  if (slug) rebuildSlug(slug)
})
watcher.on('add', path => {
  const slug = slugFor(path)
  if (slug) rebuildSlug(slug)
})

process.on('SIGINT', () => {
  watcher.close()
  process.exit(0)
})
