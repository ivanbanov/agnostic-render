# ADR-0001: Reactivity kernel — @preact/signals-core

- Date: 2026-06-02

## Context

`core/` must drive UI for very different render targets — React DOM, React
Native, Ink (TUI), Vue, Solid, and (plausibly) a raw canvas / Pixi loop — from
one substrate-agnostic machine layer. The hard requirement is **fine-grained,
per-cell reactivity at scale**: with up to ~5,000 independently-stateful
elements on a canvas/TUI surface, a change to one piece of state must update
only the elements that read it (O(changed)), never re-run all 5,000 (O(all)).

Today the engine uses a single monotonic `version` counter as the change
signal. React subscribes to it via `useSyncExternalStore`. This is correct and
simple, but coarse: any context change bumps the global version, so every
subscriber re-renders even if its slice didn't change. At 5,000 elements that
fan-out is unacceptable, and a per-element selector-scan over a global version
is itself O(N) per change — also unacceptable at that scale.

The fix is true per-cell reactivity: each context cell is its own reactive
unit; changing it notifies only its subscribers. Rather than hand-roll
glitch-free fine-grained reactivity (batching, diamond dependencies, lazy
computed — the subtle, bug-prone parts), we evaluated adopting a small,
dependency-free signal kernel. Two candidates: **alien-signals** and
**@preact/signals-core**.

We read both libraries' source and benchmarked them at our target scale
(`benchmark/alien-vs-preact/`, run via `pnpm bench:signals` / `pnpm bench:frame`).

Findings:

- **Both are pure-JS, dependency-free, framework-agnostic** (no DOM
  assumption), and both implement dependency tracking as intrusive
  doubly-linked dependency lists with per-edge versions. Both propagate only
  along the changed node's subscriber chain → **O(changed)**, verified by an
  assertion in the bench (a single-cell update fires exactly 1 effect, not N).
- **Performance is a wash on the path we'll actually use.** At 5,000 elements
  every scenario is far under a 16ms frame budget; high-level alien ≈ preact
  within noise (e.g. batched-frame ~0.15ms each). Single-cell updates are below
  timer resolution on both.
- **alien's only real edge is its low-level `createReactiveSystem` `notify`
  seam** (you own the scheduler), which was ~50µs faster on a 1,000-change
  frame — a negligible absolute saving — and proved fragile: it is alien's
  primitive for building its *own* signal/computed/effect, not a documented API
  for hand-rolled nodes, requiring reverse-engineering its internal
  link-version/dirty-flag protocol.
- **We will not use the low-level seam for any framework target.** React, Ink,
  React Native, Vue, and Solid all own their render loop; we bridge our core
  signals into each via `useSyncExternalStore` (React/Ink/RN) or the native
  signal boundary (Vue `shallowRef`, Solid `from`/`createSignal`). The
  low-level `notify` seam is only ever relevant for a self-owned raw render loop
  (raw canvas/Pixi, raw terminal) — a target we may never build.
- **@preact/signals-core is the maturity pick:** ~4.2KB, `sideEffects: false`,
  zero deps, stable v1.x API since 2022, and already battle-tested inside Miro's
  canvas26 — in-house proof it drives a real canvas workload. Its synchronous
  effects map cleanly onto `useSyncExternalStore` for the React-family targets.

## Decision

**Adopt `@preact/signals-core` as the reactivity kernel inside `core/`.**

Context cells become signals; derived values become computed signals; effects
use `effect()` + `batch()`. Per-target adapters bridge signals to each
framework's reactivity entry point (high-level API only). The existing global
`version` counter is kept only as an optional coarse tripwire / devtools aid,
not as the fine-grained render driver.

We do **not** use alien-signals, and we do **not** use any low-level
`createReactiveSystem`-style seam for framework targets.

## Consequences

- **Positive:** fine-grained O(changed) updates at 5k scale, glitch-free
  batching and lazy computed for free, a tiny dep-free pure-JS kernel that
  preserves substrate-agnosticism, and a clean `useSyncExternalStore` bridge for
  the React-family targets. Controlled/uncontrolled cells and `refs`
  (non-reactive state) become natural to express.
- **Negative:** a dependency in `core/` (previously dependency-free). It is
  small, stable, and pure-JS, so the substrate-agnostic property holds — but it
  is a dependency, and the engine's reactivity is now defined by an external
  library's semantics.
- **Deferred:** if we ever build a self-owned raw render loop (raw canvas/Pixi
  or raw terminal without Ink), the per-frame scheduler is ours to write on top
  of `effect()` + `batch()` (mark-dirty + flush on rAF). The alien low-level
  `notify` seam is the only thing preact can't match there, and even that is
  ~50µs and fragile — revisit only if profiling a real raw-loop target demands
  it.

## Alternatives considered

- **alien-signals.** Equal performance on our path, top of microbenchmarks,
  and the lineage behind Vue's reactivity. Rejected as the core kernel because:
  v3 API still churns (risky for something embedded deep in core), and its one
  advantage (the low-level `notify` scheduler seam) applies only to self-owned
  render loops we may never build, is ~50µs, and couples to undocumented
  internals. Keep on the radar specifically for a future raw canvas/TUI loop.
- **Hand-roll per-cell reactive stores.** Total control, zero deps. Rejected:
  glitch-free updates, diamond dependencies, and batching at 5k are exactly the
  hard, bug-prone machinery a proven kernel already solves; reinventing it is a
  multi-week, high-risk effort for no real gain.
- **Keep the global version + selector subscriptions.** Zero engine change,
  fine up to moderate scale. Rejected for the 5k target: it still runs O(N)
  selector-compares per change, which is the bottleneck at thousands of
  subscribers.
- **A signals framework (Solid/Preact signals via their framework runtime).**
  Rejected: pulls a framework runtime into core, breaking substrate-agnosticism.
  (`@preact/signals-core` is the renderer-agnostic *core*, not the React
  binding — that distinction is why it's acceptable.)

## Revisit when

- A self-owned raw render loop (raw canvas/Pixi or raw terminal, no framework
  scheduler) is actually built **and** profiling shows the per-frame scheduler
  needs the alien low-level `notify` seam. Until then, high-level
  `effect()` + `batch()` covers every target.
- `@preact/signals-core` stops being maintained or ships a breaking core API
  change that costs more than the migration to alien would.
