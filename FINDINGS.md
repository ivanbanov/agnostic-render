# Benchmark findings — machine-core vs XState vs Zag

> Status: **investigation notes, not a commitment.** All numbers from this
> machine (Node v24, jsdom for React), single-run, disposable harnesses under
> `benchmark/`. ms figures are directional (jsdom ≠ browser paint); **render
> counts and ops/sec are the trustworthy metrics.** Re-run before trusting.

## TL;DR

1. **The signals architecture is technically sound** — core's earlier slowness was
   an implementation artifact (one factory closure per instance), not the model.
   The prototype refactor + select fixes make core win/tie XState on construction,
   throughput, fan-out, churn, and deep-tree re-renders.
2. **BUT for the actual target matrix, the signal kernel wins nothing it needs to.**
   Targets are React + RN + Miro Surface — all React-like, all have a scheduler,
   **none has a shared store** (confirmed). Signals' one true moat (`O(changed)`
   fan-out with no host scheduler) only fires on a **scheduler-less + shared-store**
   target. No such target is on the roadmap.
3. **So the recommendation is: keep core's STRUCTURE, drop the signal kernel.**
   A plain-reducer core (same `machine()`/`connect()`/`compose()` API, context as a
   plain object + coarse version-bump, no `@preact/signals-core`) keeps everything
   valuable — agnostic config, connect, lifecycle, portability — and sheds the
   kernel that isn't earning its place. See "Recommended direction" below.
4. **Build-vs-adopt (XState):** the engine's value is the agnostic component model
   (config + connect + per-target normalize/adapter), NOT the reactivity. That
   layer is worth owning; the kernel under it can be the simplest thing that works.
   See "Keep vs adopt XState" below.

(The detailed per-axis wins below remain accurate; they just stopped being
_decisive_ once the targets were confirmed to be scheduler-having + shared-store-free.)

### Per-axis detail (still accurate, no longer decisive)

- prototype refactor: 3× memory, 6.7× construct, throughput held, behavior identical
- per-field memory: core ≈ XState at ≤8 fields, heavier at 32+ (Proxy context fixes it)
- vs Zag: core wins React fine-graining (2 leaves/0 wraps vs 20 leaves/420 wraps deep)

## SELLING-POINT BENCHMARK + architectural explainer (for the README)

> ⚠️ These are the **optimized prototype** (class + plain kernel + COW + shared
> tags), validated against the 155-test suite but **NOT yet the shipped engine**.
> Do NOT publish until the real port lands — the current npm code is signal-core
> (12KB, slower) and a skeptic benchmarking the package would catch the mismatch.
> **Sequence: port first, then publish.** Single clean run, Node 24, shared config.

### Memory per machine — flat regardless of size

| context fields | machine-core | XState  |
| -------------- | ------------ | ------- |
| 4 (typical)    | **2.85 KB**  | 3.57 KB |
| 64 (fat)       | **2.84 KB**  | 3.55 KB |

~20% lighter than XState, flat to 64 fields AND 64 states. Zag(vanilla) = 8.57KB.

### Construction — 5000 machines (build + start)

| machine-core | XState | Zag   |
| ------------ | ------ | ----- |
| **13 ms**    | 16 ms  | 57 ms |

### Throughput — the Zag-fair metric

Zag's `send` is async/microtask-batched, so "transitions/sec" isn't comparable.
The fair, reader-acceptable metric is **wall-clock to apply N events to
completion** (drain included) — answers "how long to process N events" for sync
AND async engines alike. All three verified to apply all 200k:

|                             | machine-core | XState   | Zag      |
| --------------------------- | ------------ | -------- | -------- |
| 200k events (to completion) | **63 ms**    | 206 ms   | 248 ms   |
| effective rate              | **3.16 M/s** | 0.97 M/s | 0.81 M/s |

→ ~3.3× faster than XState, ~3.9× faster than Zag, measured fairly for batching.

### Fine-grained fan-out — 1 shared machine, 1000 observers, change 1 field

|                        | observer fires/change | React re-renders/change      |
| ---------------------- | --------------------- | ---------------------------- |
| machine-core           | **1.0**               | **2** (constant, any size)   |
| XState (@xstate/react) | 1.0                   | 2                            |
| Zag (@zag-js/react)    | —                     | **20** (grows w/ tree depth) |

NOTE (correction): the plain kernel's bus calls all M subscribers, but each runs
its selector + Object.is and only fires the LISTENER on a real change → effective
fan-out is **1.0 fires/change**, same as signals. The plain kernel did NOT lose
the property that matters. (It's the @xstate/react useSelector shape.)

### Bundle (min+gzip)

machine-core ~3.7KB (no signals dep) · Zag core 2.2KB · @xstate/store 3.3KB ·
XState full 14.5KB.

### Honest README framing (don't overclaim)

- Lead with the verified, unambiguous wins: **lighter + flat memory, faster
  construct, ~3–4× event throughput, ties best-in-class React fine-graining
  (XState) and beats Zag's, smaller bundle.**
- Do NOT claim a fine-graining _moat over XState_ — they tie (both delegate
  narrowing to React's scheduler). The distinct edge is throughput + flat memory +
  bundle + the agnostic component model. "No host scheduler needed" is real but
  only matters on a scheduler-less target (Surface/React/RN are not) → footnote.
- One-liner: _"Smaller and faster than XState — flat ~2.8KB/machine, ~3–4× event
  throughput, surgical re-renders — without giving up the render-anywhere model."_

### The architectural "why" (3 paragraphs, no image needed)

**Why it's faster — and why it's not a free lunch XState forgot.** XState is built
around the actor model: every machine is an actor whose state is a single
immutable _snapshot_ you can serialize, persist, replay, and inspect in Stately's
visual tools. Every transition allocates a fresh snapshot and pushes it through an
observable pipeline to all subscribers — which buys time-travel debugging, server
rehydration, and a visualizer, but taxes the hot path with an allocation + a coarse
fan-out per event. machine-core makes the opposite bet: it does NOT treat state as
a serializable snapshot; it mutates a plain context object in place and notifies via
a version counter, so a transition is ~a function call + a property write. The 3–4×
throughput and flat ~2.8KB come from a **narrower contract**, not better engineering.

**It's a deliberate trade, not a gap XState will close.** XState can't drop the
snapshot model without ceasing to be XState — serialization, replay, and the
inspector all require state to be an immutable copyable value, fundamentally
incompatible with the in-place mutation that makes machine-core cheap. So the gap
isn't a roadmap bug; it's the shadow of features XState chose and machine-core chose
to live without. Need to persist a machine, rewind it, or watch it in a visual
debugger → XState, worth its cost. Driving thousands of lightweight UI machines you
never serialize → you're paying for capabilities you don't use.

**Versus Zag, it's a different axis.** Zag is also lean but delegates its reactivity
to the host framework (React/Vue/Solid reconciler) and presumes a DOM. machine-core
owns its reactivity internally, so the same machine runs byte-for-byte identically
on the DOM, React Native, or a bare canvas with no framework — and its re-renders
stay surgical (2 changed → 2 re-renders) where Zag's grow with tree depth (20× more
in a deep tree). The headline isn't "we win their game" — it's giving up persistence
(XState) and framework-delegated rendering (Zag) to be the smallest, fastest engine
for one behavior that runs unchanged on every render target.

## What was compared, and how

- **core** — `@render-experiment/machine-core` (current `machine()`), signals.
- **core(proto)** — throwaway prototype: same behavior, logic on a shared
  prototype instead of per-instance closures (`benchmark/proto/machine-proto.ts`).
- **xstate** — real statechart, `createMachine` + `createActor`. Headless
  `actor.subscribe` is COARSE; fine-graining is `@xstate/react useSelector`.
- **zag** — `@zag-js/core` + `@zag-js/react` (React only) and `@zag-js/vanilla`
  (`VanillaMachine`, headless). Headless `send` is **async/microtask-batched**,
  so it can't share a synchronous ops/sec loop — measured in React only.
- **@xstate/store** — excluded from the final comparison: it's a store, not a
  statechart.

## Results

### Construction + memory (5000 machines, 1 field)

|                  | construct | per unit  | memory/unit |
| ---------------- | --------- | --------- | ----------- |
| core (current)   | 65.7ms    | 13.1µs    | 11.8KB      |
| **core (proto)** | **9.8ms** | **2.0µs** | **4.1KB**   |
| xstate           | 19.0ms    | 3.8µs     | 3.6KB       |

→ Prototype: **6.7× faster construct, 2.9× less memory** than current core; now
**2× faster to construct than XState**, memory within a hair.

### Per-event throughput (1 machine, 2M events)

| core(current) | core(proto) | xstate  |
| ------------- | ----------- | ------- |
| 3.40M/s       | **3.71M/s** | 0.84M/s |

→ Core is **~4.4× faster per event** than XState (XState's actor+assign is heavy).
The prototype refactor did not regress this.

### Memory vs field count (5000 machines, clean per-run isolation)

| fields | core(proto) | xstate     |
| ------ | ----------- | ---------- |
| 1      | 4.08KB      | 3.62KB     |
| 4      | 5.52KB      | 3.56KB     |
| 16     | 11.75KB     | 3.57KB     |
| 64     | **41.59KB** | **3.56KB** |

→ **The one real weakness.** Core allocates a signal + getter per field; XState
holds context as one plain object (flat ~3.6KB). 11× heavier at 64 fields.
Mitigation below.

### React re-renders — list, move highlight (rows/move; lower better)

| N    | core | xstate | zag      |
| ---- | ---- | ------ | -------- |
| 100  | 2.0  | 2.0    | 2.0      |
| 1000 | 2.0  | 2.0    | **20.0** |

### React deep tree — 1000 branches × 20 deep, change one field

| lib    | mount ms | leaves/move | wraps/move |
| ------ | -------- | ----------- | ---------- |
| core   | 114.9    | **2.0**     | **0.0**    |
| xstate | 86.1     | **2.0**     | **0.0**    |
| zag    | 80.7     | **20.0**    | **420.0**  |

→ Core ties XState (both surgical: 2 leaves, 0 wrappers). **Zag leaks** — 420
wrapper re-renders/move at depth. Core's mount is ~30% slower (signal floor).

### Headless shared-store fan-out — 1 machine, M field-observers, change 1 field

| M    | core fires/change | coarse+compare selector RUNS/change |
| ---- | ----------------- | ----------------------------------- |
| 1000 | **1.00**          | 1000                                |
| 5000 | **1.00**          | 5000                                |

→ Core's irreplaceable win. On a scheduler-less target (raw canvas/WebGL/TUI),
the alternative (coarse subscribe + per-observer compare, what you'd hand-roll
over `actor.subscribe`) runs **all M selectors every change**. Core runs 1.

### Independent units (one machine per element), change one

Both core and XState are **O(1)** here — headless and in React. Each unit is its
own subscription; no leak. _If your 5k elements are independent machines, XState
alone is genuinely fine on this axis._

### Create/destroy churn (50k short-lived machines)

core(proto) 190ms · xstate 243ms → core faster.

## The reactivity question: do you even need core?

The honest decision rule, from the data:

| Your target                                                                        | Verdict                                                                                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| React / RN / Solid / Svelte / Vue / Lit / Miro react-like (any host **scheduler**) | XState + a thin per-env adapter (`subscribe` + `getSnapshot` + selector + compare) gets fine-graining for free. Core's edge is small here. |
| **Many readers of ONE shared store, NO host scheduler** (bare canvas/WebGL/TUI)    | **Core is irreplaceable** — `O(changed)` vs `O(observers)·selector`. This is the whole justification.                                      |
| One machine per element (independent units)                                        | XState is fine (O(1) both). Core's signals are a memory _liability_ here at fat context.                                                   |

The deciding fact only you can supply: **on the Miro canvas, is it 5k independent
units or 5k readers of one shared store — and does its react-like lib expose a
`useSyncExternalStore`-equivalent?** That answers build-vs-XState.

XState's headless surface is exactly `subscribe(cb)` (coarse) + `getSnapshot()` +
`send()` — i.e. the `useSyncExternalStore` contract. So delegating reactivity to
each framework's scheduler (your instinct) **is viable** for all scheduler-having
targets. Core only wins where there is no scheduler to delegate to.

## Recommended speedups (ranked)

1. **Prototype refactor — DO THIS.** Move the ~30 per-instance inner functions
   (`_resolveGuard`, `_send`, `_applyTransition`, `_runActions`, `makeSelection`,
   …) onto a shared prototype/class. Per-instance keeps only: signal cells, the
   `queue`/cleanup arrays, flags, lazily-created listener Sets, and the 2 bound
   closures actions need (`send`, `setContext`). Validated: 3× memory, 6.7×
   construct, throughput held, fine-grained intact, behavior identical.
   Prototype: `benchmark/proto/machine-proto.ts`.

2. **Lazy Proxy context — ONLY if elements have fat context (32+ fields).** A
   `Proxy` over a plain backing store, upgrading a field to a signal on first
   touch. Memory at 64 fields/few-observed: **3.3KB vs 36KB eager (11×)**, beating
   XState. Cost: reads drop 419M→30M/sec (still ~8× the event rate, fine).
   `benchmark/proto/lazy-context.ts` (`lazyContext`). NOTE: a lazy _getter_
   (non-Proxy) variant does **not** help — the per-field getter descriptors are
   themselves the cost, so only the Proxy (zero per-field allocation) wins memory.

3. **Shared-empty tag Set + skip `tagsOf` when no tags.** ~16% faster construct
   for tagged machines; one fewer object for the common no-tags machine. Trivial,
   no downside.

4. **Hot path `send` — nothing to do.** Already 0.28µs with a real action, 0.05µs
   to bail on no match; guard vs no-guard identical (`_guardParams` alloc is not a
   cost). Leave it.

### Select / useSelector fixes — APPLIED to the real engine (163 tests green)

Three changes that cut React per-leaf mount ~166ms → ~99ms (1000×20 deep tree),
re-render still surgical (2.0 rows/move), full suite passing:

- **`makeSelection` takes the raw selector (one effect, not computed+effect).**
  `.subscribe` runs a single preact effect evaluating the selector directly;
  `.value` lazily builds a computed only if read. ~25% off the subscribe path.
  (`packages/core/machine/src/machine.ts`)
- **`useSelector` drops the `isEqual` ref.** `isEqual` is read once at subscribe
  time, not per change, so it's closed over directly — one fewer `useRef` +
  per-render write per leaf. (`packages/react/machine/src/use-selector.ts`)
- **`useSelector` getSnapshot evals the selector directly, not `sel.value`.**
  React calls getSnapshot during every leaf's mount render; routing through
  `.value` would allocate a computed node per leaf. The snapshot read needs no
  tracking, so a plain eval skips that allocation. ~33% off the binding micro-bench.

**Ceiling reached, by design.** After these, core mounts ~99ms vs xstate ~76ms
(~1.25×). The residual is irreducible: core creates ONE preact reactive effect
per leaf (~0.10µs floor for the node) where xstate does ONE array push. You can't
make "instantiate a tracked node" cheaper than "array.push" — that node IS the
auto-tracking. **Mount is xstate's axis; stop optimizing it.** Core's real leads
are construction, throughput, and the headless O(changed) fan-out (below).

## Caveats / what's NOT yet validated

- The prototype passed a **basic** correctness check (transitions, actions,
  select, fine-grained, dedup) but has **not** been run against the full test
  suite — `after`, `watch`, `compose`, `connector`, effects/cleanup ordering,
  the queue's run-to-completion edge cases. A real port must go green there.
- Memory numbers are GC-sensitive; the field-count table used per-run isolation
  and is the trustworthy one. Inline "KB" figures in ad-hoc probes were noisy.
- jsdom, not a browser — absolute ms are directional only. Trust the counts.
- Zag's wall-ms looks fastest (microtask batching collapses flushes); ignore it.
  The trustworthy Zag metric is **rows re-rendered**, where it loses.

## Why XState & Zag are coarse — and whether our wins are a moat

Read from XState v5's actual source (`xstate-actors.umd.min.js`), not docs.
XState's `update()` is literally:

```js
update(snapshot) {
  this._snapshot = snapshot                          // replace the WHOLE value
  for (const o of this.observers) o.next?.(snapshot)  // notify EVERY observer
}
```

`getSnapshot()` returns one immutable `{ status, context, value, ... }`; each
transition builds a **fresh context object**. The coarseness is **load-bearing**,
not laziness — it falls out of three deliberate commitments:

1. **State is a serializable snapshot.** `getPersistedSnapshot` / `restoreSnapshot`
   exist to ship a machine to JSON, rehydrate on a server, replay. That REQUIRES
   state to be one plain immutable value — **fundamentally incompatible with a
   graph of live signal cells.** They chose persistence/replay over fine-graining.
2. **The actor model wants one uniform observable.** A machine, a promise
   (`fromPromise`), an observable (`fromObservable`), a callback (`fromCallback`)
   ALL implement `subscribe(o) → o.next(snapshot)` — it's RxJS's Observable. A
   promise-actor has only one value; "field x changed" can't be expressed across
   all actor kinds. The lowest common denominator is coarse: "here's the new whole
   value." They chose actor-model uniformity over fine-graining.
3. **They assume a host framework narrows.** `actor.select(selector, compare)`
   exists but is coarse underneath (subscribes to the whole actor, runs `compare`
   on every emission). Real fine-graining is `@xstate/react useSelector` →
   `useSyncExternalStoreWithSelector`, where REACT dedupes renders. They
   explicitly delegate "update only what changed" to the host scheduler — exactly
   this engine's thesis, confirmed from their code.

**Zag** is the same root, softer: it keeps machines "lightweight… avoiding complex
concepts" (their words) and delegates reactivity to the framework adapter
(`bindable` + `track` → `useMemo`/`createMemo`/`$derived`). Its deep-tree leak
(420 wrapper re-renders/move) is a **binding gap** — `@zag-js/react` has no
per-leaf `useSelector` (xstate-react does); they could add one. But Zag has no
standalone headless service at all, so the no-host-scheduler win holds even harder.

### Moat assessment — can they fix what we beat them on?

| Our win                                    | Can they fix it?                                                                                                             | Moat                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Headless `O(changed)` fan-out**          | XState: **no** — breaks the serializable-snapshot model (#1) and the uniform actor interface (#2). Zag: no headless service. | **Strong moat**                 |
| **No host scheduler needed**               | Neither — both delegate narrowing to the host _by design_. They cannot close this on a scheduler-less target.                | **Strong moat**                 |
| Per-event throughput (4.3× vs xstate)      | Partly — actor/assign overhead is somewhat inherent                                                                          | Soft lead                       |
| Construction (1.7×)                        | Yes, they could optimize                                                                                                     | Temporary                       |
| React re-render vs Zag (2 vs 20 rows/move) | Zag could add a `useSelector` hook                                                                                           | Temporary vs Zag; tie vs xstate |
| Mount                                      | They already win                                                                                                             | Their moat                      |

**Bottom line:** the two durable advantages — **headless fine-graining** and
**zero host-scheduler dependency** — are things XState/Zag can't adopt without
abandoning what they _are_ (serializable actor snapshots; framework-delegated
reactivity). They didn't go coarse from laziness; fine-grained signals are
incompatible with the persistable-snapshot actor model, and they bet (correctly,
for their audience) that a host framework would always be there to narrow. **Our
moat is real precisely on the target they assume away: a render surface with no
host reactivity.** If the canvas has no React-like scheduler underneath, we own
ground neither can take; if it does, they've largely solved it and our lead is
mostly temporary. → see the canvas-target analysis below.

## The canvas target (Miro Surface) — what it actually is

Read from `~/dev/miro/surface/src`. The decisive question was "does the canvas
have a host scheduler / React-like reactivity, or is it a bare render loop?"

**It has a scheduler. It's React-like.** Findings:

- The rendering engine is **C++ / Skia / Emscripten-WASM** (`Engine`, `EngineWASM`).
  Frontends talk to it via WASM bindings. `Frontend/React` is an empty stub.
- The widget-facing layer is **`SurfaceWidgetSDK` — "a minimal React-like framework
  in TypeScript" (WidgetRuntime)**. Its own AGENTS.md describes it as a
  **Reconciler** that "evaluates component functions, manages hook state, detects
  changes, schedules effects," with **Cells** = "hook storage slot indexed by call
  order (like React)" and a **Runner** = "task scheduler, batches updates across
  microtask/frame/idle."
- `useState`'s setter calls `reconciler.scheduleStateEvaluation(cell.unit, …)` —
  i.e. **it schedules a re-evaluation of the component (Unit)**. This is coarse,
  component-level, scheduler-batched reactivity — **the React model, not signals.**

### What this means for build-vs-adopt

The canvas widget host is a **scheduler-having, coarse, React-like target.** Per
the decision rule above, that lands in the row where **XState + a thin adapter
(`subscribe`+`getSnapshot`+selector+compare) gets fine-graining "for free"** by
delegating to the WidgetRuntime reconciler/Runner — the same way `@xstate/react`
leans on React. Core's headless `O(changed)` moat **does not apply here**, because
there IS a host scheduler to narrow into.

**CONFIRMED (user):** Surface has **no `useSelector`** (no slice-selector hook)
and **no shared store** — widgets are independent component trees. Both facts are
now settled, not assumptions.

What they imply, together:

- **No shared store → signals' `O(changed)` advantage NEVER triggers on Surface.**
  Each widget is its own tree; there is no "5k observers on one machine" pattern
  for fine-graining to win. This is the biggest blow to the signals case.
- **No `useSelector`** would matter only IF there were a shared store (the host
  would re-run all observers). There isn't, so it's moot here too.
- A widget = one component tree per instance (independent units) → XState/reducer
  is **O(1)** anyway; core's per-field signal memory is a mild liability.
- Behavior portability ("byte-identical machine on web + WASM canvas + RN") remains
  a _non-performance_ reason to own the engine — a product call, not a benchmark.

**Net:** Surface is NOT the scheduler-less, shared-store target that justifies the
signal kernel — it's a React-like reconciler with independent widget trees. On the
measured + confirmed evidence the signal kernel earns **nothing reactive** here.
The only remaining cases for core are portability and per-event throughput (see
the throughput note below for how rarely that bites), not `O(changed)` fan-out. If
a future target is a _bare_ WebGL/loop with no reconciler AND a shared store, the
moat reappears.

## "Same machine in React + RN" — does the signal moat fire? NO.

React and React Native **share the same reconciler + scheduler** (`react` +
`react-reconciler`; RN only swaps the host renderer DOM→native). Both expose
`useSyncExternalStore`; `@xstate/react` is first-class on both. So for a machine
reused across React + RN, fine-graining is delegated to the **same** React
scheduler whether you use XState or core. Two scheduler-having targets ≠ a
scheduler-less one.

| Scenario (React + RN only)                 | Signals win?                                                                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Independent machines (one per component)   | ❌ tie — both O(1)                                                                                                                    |
| Shared machine + `useSelector` per leaf    | ❌ tie — React narrows for both                                                                                                       |
| Shared machine, coarse reads (no selector) | ❌ React re-renders coarsely either way — signals don't help, because the re-render is driven by React's subscription, not the engine |

Key point on the last row: on React/RN the re-render is **React's** concern. If a
component reads `machine.context.x` coarsely, React re-renders coarsely regardless
of whether the engine underneath is signals or a plain object. **Signals only win
when the observer ITSELF is the reactive primitive** — i.e. no React component in
the subscription loop. On React/RN there always is one. → For a React+RN(+Surface)
matrix, the signal kernel wins **nothing reactive** anywhere.

## On "signals can't be serialized" — corrected, and SSR/RSC

Earlier phrasing was too absolute. **Signal _values_ serialize fine; the _graph_
doesn't.**

- Snapshot-out is trivial: walk cells → `{ field: cell.value }` → JSON.
- The hard part is rehydrate + replay: the dependency graph (which computed reads
  which cell, which effect tracks what) can't be serialized — you re-derive it by
  **running setup, then poking values in**. So "restore" = re-run + `setContext`,
  not "deserialize a complete object." And there's no free time-travel (a signal
  graph is mutable/stateful; XState treats a snapshot as a replayable immutable
  value — N past snapshots, deterministic replay).
- **SSR: fine for signals.** Render on server, read `.value`, send `{state,context}`,
  re-create + `setContext` on hydrate (the `getServerSnapshot` story). Not a blocker.
- **RSC: a non-issue.** A state machine is client-side in RSC either way (server
  components are static, no hooks/state). RSC serializes _props_ (plain JSON) across
  the boundary; both libs pass props fine. RSC doesn't differentiate them.
- **For our targets** (WASM canvas widget + React + RN): replay and
  RSC-serialization of machine state are **not requirements**, so this trade costs
  nothing. XState's serializable-snapshot guarantee is a strength we don't need.

## What "per-event throughput (4.3×)" actually is — and why it rarely matters

The metric: **how many `send(event)` → transition cycles/sec**, end to end (lookup
→ guard → actions/`setContext` → state switch). Core ~3.6M/s, XState ~0.84M/s; the
gap is XState's actor/`assign`/snapshot-rebuild overhead.

**It only becomes a bottleneck when a huge number of events fire in a tight window
and the _machine processing_ is on the critical path** — e.g.:

- high-frequency input: `pointermove`/drag at 100s–1000s/sec × many machines (5k
  draggable elements each tracking their own pointer) → can reach millions of
  `send`/sec during an interaction;
- animation/physics: a machine `send`-ed every frame (60fps) × thousands of elements;
- bulk/replay: import a board, replay a multiplayer log, a test firing 100k events.

**Why it rarely matters for UI machines:** a tooltip/dropdown/checkbox fires a
_handful_ of events per user action; a human clicks a few times/sec. At that rate
0.84M and 3.6M/sec are _both_ infinitely fast — the bottleneck is the human, then
the render, never the transition. Even in the high-frequency case the **render** is
the wall, not the transition (1000 drag events = ~0.3ms of transitions at 3.6M/sec,
vs. 1000 repaints). So the 4.3× is a real number that only cashes out on a
physics/drag-heavy many-element canvas — a benchmark trophy for ordinary components.

## Recommended direction: plain-reducer core (drop the signal kernel)

The valuable part of `machine-core` was never the signals — it's the **agnostic
component model**: one config describes behavior; `connect()` maps state → a
substrate-agnostic view API; per-target `normalize`/`withAdapter` translate to DOM/
RN/canvas; `compose()` runs orthogonal regions; lifecycle is uniform. That layer is
worth owning. The signal kernel underneath it is solving fan-out/no-scheduler
problems the targets don't have, while costing per-field memory + maintenance.

**Proposal:** keep the entire public API, swap the kernel for a plain object +
coarse notification. Same `machine()` / `connect()` / `connector()` / `compose()` /
`select()` surface; `@preact/signals-core` removed.

Sketch — context becomes a plain object + a version counter; subscribers are a Set:

```ts
function createContext(initial) {
  let ctx = { ...initial }
  let version = 0
  const listeners = new Set()
  return {
    get context() {
      return ctx
    }, // plain read, no getter-per-field
    setContext(patch) {
      // shallow-equal dedup, then bump
      let changed = false
      for (const k in patch)
        if (!Object.is(ctx[k], patch[k])) {
          changed = true
          break
        }
      if (!changed) return
      ctx = { ...ctx, ...patch }
      version++
      for (const l of listeners) l()
    },
    subscribe(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
}
```

`select(fn)` becomes the **xstate model**: run `fn` over current state, cache it,
re-run + compare on each coarse notification, fire only on change. On React/RN/
Surface that's exactly what `useSyncExternalStoreWithSelector` wants — the host
scheduler dedupes the renders, same as XState. (We measured this is a tie on those
targets; the only place it loses is shared-store-no-scheduler, which we don't have.)

What you GAIN: flat ~3.6KB/machine memory (no per-field signals), simpler code, one
fewer dependency, no signal-graph rehydration story to worry about, faster mount
(no per-leaf reactive node — back to xstate's "array push" cost).

What you LOSE: intrinsic `O(changed)` (now `O(observers)` per change, narrowed by
the host) and the no-scheduler property. Both are moot for the confirmed targets.

If a scheduler-less + shared-store target ever appears, the context layer is
isolated enough to swap back to signals behind the same interface — so this isn't
a one-way door.

## Keep this lib vs adopt XState

Two different questions, often conflated:

**Q1 — reactivity kernel:** signals vs plain reducer. → Answered above: **plain
reducer** for the confirmed targets.

**Q2 — whole engine:** own `machine-core` vs adopt `xstate` + `@xstate/react`. →
This is the real decision. The honest trade:

|                                                                               | Keep `machine-core` (plain-reducer)                  | Adopt XState                                                                   |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Agnostic component model (config→connect→normalize, one behavior all targets) | ✅ purpose-built for it; this IS the point           | ⚠️ you'd build the connect/normalize/bindings layer ON TOP of xstate anyway    |
| Surface / WASM-canvas target                                                  | ✅ thin adapter, you control it                      | ⚠️ xstate runs (it's just JS), but you still write the canvas adapter yourself |
| React + RN                                                                    | ✅ tiny `useSelector`/`useMachine` (already written) | ✅ `@xstate/react` mature, free                                                |
| Statechart features (nested, parallel, history, actors, invoke, delays)       | ❌ flat + `compose` only; you build more as needed   | ✅ comprehensive, battle-tested                                                |
| Serialization / replay / inspector / Stately viz                              | ❌ none                                              | ✅ first-class (irrelevant to current targets, but real)                       |
| Maintenance                                                                   | ❌ you own every bug                                 | ✅ offloaded to a funded team                                                  |
| Bundle                                                                        | ✅ ~3.7KB gz (smaller without signals)               | ❌ ~14.5KB gz (full xstate)                                                    |
| Throughput                                                                    | ✅ 4.3× (rarely matters — see note)                  | ➖ slower (rarely matters)                                                     |
| Per-component fine-graining on the real targets                               | ✅ tie                                               | ✅ tie                                                                         |

**The crux:** XState gives you a _machine_. It does NOT give you the
agnostic-component layer (config that names effects per-platform, `connect` →
bindings vocabulary, per-target `normalize`, the connector's prop-callback
reactions). That layer — which is most of `machine-core`'s actual code and value —
**you'd have to build on top of XState regardless.** So "adopt XState" really means
"adopt XState as the kernel and still build your component framework around it."

Given that:

- If the component model is the product (it is) and the targets are
  React-family/Surface (they are): **a small plain-reducer core you own is the
  better fit** than wrapping XState — you avoid xstate's bundle + actor overhead
  and a wrapper-impedance layer, for behavior that only needs flat states +
  compose. The reactivity is a tie either way on these targets.
- **Adopt XState if** you need its statechart depth (nested/parallel/history/
  actors) or its tooling (Stately viz, inspector, persistence) — none of which the
  current components (tooltip, dropdown) require.
- **Strongest hybrid:** keep `machine-core`'s component model, make the kernel a
  plain reducer, and don't rule out XState as the kernel _later_ if statechart
  depth becomes a real requirement — the connect/normalize layer wouldn't change.

**Recommendation:** keep the lib, drop the signal kernel (plain-reducer), don't
adopt XState now. Re-evaluate adopting XState-as-kernel only if/when a component
genuinely needs nested/parallel/actor semantics that `compose` can't express.

## Plain-reducer kernel — VALIDATED against the real suite + memory dissected

Built `benchmark/proto/machine-plain.ts`: the real `machine()` with the signal
kernel swapped for a plain object + one coarse notification bus (version counter,
listener Set). Ran the **real 155-test machine-core suite** against it via a vitest
alias (`benchmark/proto/vitest.plain.config.ts` → `machine-plain-shim.ts`).

**Result: 155/155 pass.** Including `subscribe`, `connector`, `compose`, chained
`computed`, `watch`, `after`. The coarse-bus model is behaviorally identical to
signals across the entire surface — the correctness risk (esp. computed chains +
watch) is cleared.

Benchmarks (plain vs signal core vs xstate):

| metric                           | signal core | plain core            | xstate   |
| -------------------------------- | ----------- | --------------------- | -------- |
| construct 5k, 64 fields          | 279ms       | **65ms**              | 11ms     |
| throughput (1M ev)               | 3.28M/s     | **3.52M/s**           | 0.96M/s  |
| computed chain ×20 (change+read) | 1.00M/s     | **1.09M/s** (correct) | —        |
| computed cached read             | 47.6M/s     | **53.8M/s**           | —        |
| fan-out (indep units)            | 1/change    | 1/change              | 1/change |

The predicted computed regression (version-memo recompute-on-any-change vs signals'
per-input tracking) **did not happen** — version-memo is a single int compare, and
when the root changes both must recompute the chain anyway. Values correct.

### Memory: where it goes, and how to reach xstate's 3.5KB

Plain core still measured ~12KB/machine (vs xstate 3.5KB). Dissection found the
culprit is NOT the kernel and NOT computed — it's **12KB even with no computed, not
even started.** The cost is the **factory-closure-per-instance** pattern: each
`machine()` call creates ~25 inner closures that all capture the same fat lexical
scope (config + context + queue + every other fn); V8 keeps that whole scope record
alive once per closure → ~10KB of pure structural waste. (Confirmed: a real
`machinePlain` with no computed, not started = 12.03KB; `Object.defineProperty`
getters are also ~4× heavier than plain methods.)

**xstate is 3.5KB because its methods live on a class prototype** (shared once, zero
per-instance); the instance holds only data. Replicating that — plain kernel +
class/prototype methods, instance holds only `ctx`/`stateValue`/`bus`/flags/arrays

- the 2 bound closures actions need (`send`, `setContext`) — measured:

| fields | plain (closures) | **plain + prototype** | xstate |
| ------ | ---------------- | --------------------- | ------ |
| 1      | 12.23KB          | **3.50KB**            | 3.56KB |
| 16     | 12.45KB          | **3.72KB**            | 3.55KB |
| 64     | 13.20KB          | **4.47KB**            | 3.55KB |

**Plain + prototype matches xstate's memory exactly** (3.50 vs 3.56KB at 1 field),
stays ~flat to 64 fields, keeps 3.7× xstate throughput + faster construction. The
two fixes compound: plain kernel kills per-field growth (49KB→flat); prototype
methods kill the fixed ~10KB closure overhead (12KB→3.5KB).

**Target architecture: plain-reducer kernel + class/prototype methods.** Caveat: the
3.5KB measurement stubbed effects/`after`; those are stateless prototype logic
(operate on `this`), so they add zero per-instance memory beyond the already-counted
`activeCleanups` array — but the full port must re-run the 155-test suite to confirm
fidelity, not just assert it.

## Final architecture: class + plain kernel + copy-on-write + shared tag sets

`benchmark/proto/machine-class.ts` — full behavior port (effects/after/watch/
compose/connector), **155/155 real tests pass**. Four compounding fixes get it to
**below xstate's memory, flat on every axis:**

| fix                                                                  | kills                                     |
| -------------------------------------------------------------------- | ----------------------------------------- |
| plain-reducer kernel (no signals)                                    | per-field signal cells (49KB→flat at 64f) |
| class/prototype methods                                              | per-instance closures (12KB→3.5KB)        |
| copy-on-write context (share config ref, copy on 1st write)          | per-instance context copy                 |
| shared per-config tag sets (WeakMap, not Set-per-state-per-instance) | per-state growth (20KB→flat)              |

**Final memory (shared config, the realistic case):**

| axis      | class+plain       | xstate |
| --------- | ----------------- | ------ |
| 1 field   | 2.84KB            | 3.55KB |
| 64 fields | **2.84KB (flat)** | 3.55KB |
| 1 state   | 2.84KB            | 3.50KB |
| 64 states | **2.84KB (flat)** | 3.50KB |

Plus: throughput 3.8M/s (~4× xstate), construction ~12ms/5k (faster than xstate),
155 tests green, `@preact/signals-core` removed.

### Two important lessons from the memory hunt

1. **Field "growth" was a bench artifact** — allocating a fresh F-field config per
   machine measures config objects, not machine overhead. Real code shares one
   config across instances → flat. Always reuse the config in memory benches.
2. **Static structure must be shared per-config, not copied per-instance.** Tag
   sets (and anything derived purely from the static config) belong in a per-config
   memo, exactly as xstate shares its machine definition across actors. This is THE
   technique that keeps per-instance memory flat as config size grows.

### DX impact: NONE

`machine(config)` stays a factory function returning the same `Machine` shape; the
class is internal. The 155 tests (written against the public API) pass unchanged.
Config shape, `send`/`context`/`computed`/`select`/`matches`/`hasTag`/lifecycle,
`connect`/`connector`/`compose`/`withAdapter`/`useMachine`/`useSelector` — all
identical. The only load-bearing rule (already the contract): mutate context via
`setContext`, never by poking `m.context` directly — now required because COW
shares the config's context object until first write.

## Real port plan (next)

1. `context.ts` → plain object + version + copy-on-write (share initial, copy on write).
2. `state.ts` → plain string + shared per-config tag sets (WeakMap memo).
3. `machine.ts` → convert to class `Machine`; `machine(config)` wraps `new`.
4. `store.ts` → plain signal-free store (same swap).
5. Drop `@preact/signals-core` from package.json; re-run the REAL suite + React
   `useSelector`/connector paths green.

## Files (all throwaway, under benchmark/)

- `fan-out/bench.ts` — propagation / fine-grain / throughput (core, xstate)
- `compose/bench.ts` — combine / sync / chain (core compose)
- `rerenders/` — React mount + re-render (core, xstate, zag)
- `proto/machine-proto.ts` — the prototype-refactor implementation
- `proto/lazy-context.ts` — eager / lazy-Proxy / lazy-getter context variants
- `lib/contenders.ts` — shared cell factories
