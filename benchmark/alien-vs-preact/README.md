# alien-signals vs @preact/signals-core

A decision spike: which signal kernel to embed in `core/` for fine-grained,
per-cell reactivity at this project's scale (~5,000 independently-stateful
elements on canvas / TUI, where one cell change must touch only the elements
that read it — O(changed), not O(all)).

## Run it

From the repo root:

```bash
pnpm bench:signals   # core scenarios (build / update / batch / fan-out / teardown)
pnpm bench:frame     # frame-scheduler comparison (the scheduling models)
# or directly:
node_modules/.bin/tsx benchmark/alien-vs-preact/bench.ts
node_modules/.bin/tsx benchmark/alien-vs-preact/frame-scheduler.ts
```

Run them a few times. Look at **orders of magnitude**, not third-decimal jitter —
these are Node microbenchmarks, not a real render loop.

## What it measures

| scenario | simulates |
| --- | --- |
| `build 5k signal+effect` | mounting 5k elements, each subscribing to its own cell |
| `single-cell update (1 fire)` | one element's state changes → **must fire 1 effect, not N** |
| `batched frame (1000 fires)` | a busy frame: 1,000 cells change, flushed once |
| `wide fan-out (1→5000 fires)` | one shared cell (theme/zoom) read by all 5k → worst case |
| `teardown 5k` | unmounting all 5k (disposing every effect) |

Each scenario **asserts the fire count** (e.g. single-update must fire exactly
1 effect). If propagation were O(N) instead of O(changed), the single-update
assertion would fail — so a passing run is itself the proof of fine-grained
behaviour.

## The point of the spike

The headline result is not "which is faster" — both are far below a 16 ms
frame budget at 5k. The point is the **assertion**: a single-cell update fires
exactly **1** effect on both kernels. That confirms the data structure both use
(intrusive doubly-linked dependency lists + per-edge versions) propagates only
along the changed node's subscriber chain. That is the property this project
needs, and it holds for either library.

## `frame-scheduler.ts` — the scheduling-model comparison

This is the one that informs the **architecture**, not just raw speed. It
coalesces 1,000 cell changes into one paint pass, three ways:

| strategy | where the scheduler lives |
| --- | --- |
| preact, high-level | mark-dirty glue inside each effect body; `batch()` groups writes |
| alien, high-level | identical pattern to preact; `startBatch/endBatch` groups writes |
| alien, low-level (`createReactiveSystem`) | the `notify(node)` hook collects dirty nodes in ONE place |

**What it shows:** with the *high-level* API, alien and preact schedule the
same way and perform within noise of each other — in both you bolt a
"mark-dirty + flush-once-per-frame" scheduler onto effect bodies. alien's
"you own the schedule" advantage is real but only appears via the *low-level*
`notify` seam, where dirty-collection lives in one place instead of being
smeared across every effect body.

**Honest caveat (important):** `createReactiveSystem` is alien's primitive for
building its OWN signal/computed/effect — **not a documented public API for
hand-rolled nodes**. Driving it directly means owning alien's internal
link-version / dirty-flag protocol, which is undocumented and version-fragile.
Reproducing a multi-frame effect re-run loop on it required reverse-engineering
those flags (and was dropped in favour of a fresh-graph-per-frame measurement)
— that friction *is* a finding: the low-level seam is powerful but couples you
to alien internals that can break across its (still-churning, v3) releases.

## Notes / caveats

- Both libs **dedup by value** — setting a signal to its current value fires
  nothing. The bench writes a strictly-increasing value every time and builds a
  fresh graph per scenario so fire counts are exact.
- alien uses `startBatch()` / `endBatch()`; preact uses `batch()`. Effects run
  synchronously on both (preact always; alien on batch flush). In real
  canvas/TUI use you'd wrap effects in your own per-frame (rAF) scheduler — both
  support that (preact via `batch`, alien via its pluggable `notify`).
- Auto-tracking (reading a signal inside an effect to subscribe) has near-zero
  per-read cost here: both reuse dependency-link objects across re-runs, so a
  stable re-run allocates nothing. Cost scales with edges read, not node count.
- Microbench ≠ production. Before committing the kernel, re-run a variant wired
  to your actual repaint callback in the real canvas/TUI loop.
