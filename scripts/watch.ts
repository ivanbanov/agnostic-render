/**
 * Codegen watcher.
 *
 * Watches every core component's authored files (styles.ts, machine.ts,
 * types.ts, props.ts) and re-runs the build emitter for the affected
 * component when any of them change.
 *
 * The build script writes elements.ts and api.ts inside each adapter
 * package; Vite (web) and Metro (RN) pick those changes up via their
 * own file watchers and trigger HMR. This watcher's only job is to
 * keep the generated files in sync with the agnostic core.
 */
import { resolve } from "node:path";
import chokidar from "chokidar";
import { buildAll, buildComponent, discoverComponents } from "./build";

const REPO_ROOT = resolve(import.meta.dirname ?? "", "..");
const CORE_DIR = resolve(REPO_ROOT, "packages/core/components");

// Files inside each core/components/<slug>/src/ that the codegen reads.
// Editing any of them invalidates that component's generated files.
const WATCHED_FILES = ["styles.ts", "machine.ts", "types.ts", "props.ts"];

const components = discoverComponents();
if (components.length === 0) {
  console.warn("No components found under packages/core/components/*; nothing to watch.");
  process.exit(0);
}

const slugByPath = new Map<string, string>();
const watchPaths: string[] = [];
for (const c of components) {
  for (const file of WATCHED_FILES) {
    const full = resolve(c.coreSrc, file);
    slugByPath.set(full, c.slug);
    watchPaths.push(full);
  }
}

// Initial build so consumers don't have to also run `pnpm codegen` first.
await buildAll();
console.log(`[watch] ready — watching ${components.length} component(s)`);

// Debounce per slug so a save that touches multiple files batches into
// one rebuild.
const pending = new Map<string, NodeJS.Timeout>();
function rebuildSlug(slug: string) {
  const existing = pending.get(slug);
  if (existing) clearTimeout(existing);
  pending.set(
    slug,
    setTimeout(async () => {
      pending.delete(slug);
      const component = components.find((c) => c.slug === slug);
      if (!component) return;
      try {
        await buildComponent(component);
      } catch (e) {
        console.error(`[${component.pascal}] failed: ${(e as Error).message}`);
      }
    }, 50),
  );
}

const watcher = chokidar.watch(watchPaths, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
});

watcher.on("change", (path) => {
  const slug = slugByPath.get(path);
  if (slug) rebuildSlug(slug);
});
watcher.on("add", (path) => {
  const slug = slugByPath.get(path);
  if (slug) rebuildSlug(slug);
});

process.on("SIGINT", () => {
  watcher.close();
  process.exit(0);
});
