/**
 * Frame-scheduler comparison: how each kernel coalesces "many cell changes
 * during a frame" into ONE repaint pass — the canvas/TUI render-loop shape.
 *
 * Three strategies, same workload (change CHANGES cells, paint each dirty
 * element exactly once per frame):
 *
 *   1. preact (high-level)  — effect body marks dirty + schedules a flush;
 *                             writes wrapped in batch() so effects fire once.
 *   2. alien  (high-level)  — IDENTICAL pattern: effect body marks dirty +
 *                             schedules; writes wrapped in startBatch/endBatch.
 *   3. alien  (low-level)   — createReactiveSystem: the `notify(node)` hook
 *                             collects dirty nodes directly. NO per-effect
 *                             scheduler glue — the scheduler lives in ONE place.
 *
 * The point this demonstrates in running code:
 *   - With the HIGH-LEVEL API, alien and preact schedule the same way. You
 *     bolt a "mark-dirty + flush-once" scheduler onto effect bodies in both.
 *   - alien's architectural advantage (graph decoupled from render loop) only
 *     appears via the LOW-LEVEL createReactiveSystem `notify` seam — strategy 3.
 *
 * "Frame" here is a synchronous flush (not real rAF) so it's deterministic
 * and measurable. In production `scheduleFrame` would be requestAnimationFrame.
 *
 * Run: pnpm bench:frame   (or tsx benchmark/alien-vs-preact/frame-scheduler.ts)
 */

import * as alien from 'alien-signals'
import { createReactiveSystem, type ReactiveNode, ReactiveFlags } from 'alien-signals/system'
import * as preact from '@preact/signals-core'

const N = 5_000
const CHANGES = 1_000 // cells that change within one frame
const REPEAT = 5

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!
const time = (fn: () => void) => {
  const t0 = performance.now()
  fn()
  return performance.now() - t0
}
let TICK = 1
const next = () => TICK++

// =============================================================================
// Strategy 1 — PREACT, high-level. Scheduler glue lives IN each effect body.
// =============================================================================

function preactFrame() {
  const sigs = Array.from({ length: N }, () => preact.signal(0))
  let painted = 0
  const dirty = new Set<number>()

  // Each effect: subscribe to its cell, then mark-dirty (don't paint inline).
  const disposers = sigs.map((s, i) =>
    preact.effect(() => {
      s.value // subscribe
      dirty.add(i) // ← scheduler glue, per effect
    }),
  )
  dirty.clear()

  const flush = () => {
    for (const _ of dirty) painted++ // "repaint" each dirty element once
    dirty.clear()
  }

  const ms = median(
    Array.from({ length: REPEAT }, () => {
      painted = 0
      const t = time(() => {
        preact.batch(() => {
          for (let i = 0; i < CHANGES; i++) sigs[i]!.value = next()
        })
        flush() // one frame
      })
      if (painted !== CHANGES) throw new Error(`preact painted ${painted}, want ${CHANGES}`)
      return t
    }),
  )
  disposers.forEach(d => d())
  return ms
}

// =============================================================================
// Strategy 2 — ALIEN, high-level. SAME pattern as preact: glue in effect body.
// =============================================================================

function alienFrameHighLevel() {
  const sigs = Array.from({ length: N }, () => alien.signal(0))
  let painted = 0
  const dirty = new Set<number>()

  const disposers = sigs.map((s, i) =>
    alien.effect(() => {
      s() // subscribe
      dirty.add(i) // ← scheduler glue, per effect (identical to preact)
    }),
  )
  dirty.clear()

  const flush = () => {
    for (const _ of dirty) painted++
    dirty.clear()
  }

  const ms = median(
    Array.from({ length: REPEAT }, () => {
      painted = 0
      const t = time(() => {
        alien.startBatch()
        for (let i = 0; i < CHANGES; i++) (sigs[i] as (v: number) => void)(next())
        alien.endBatch()
        flush()
      })
      if (painted !== CHANGES) throw new Error(`alien-hl painted ${painted}, want ${CHANGES}`)
      return t
    }),
  )
  disposers.forEach(d => d())
  return ms
}

// =============================================================================
// Strategy 3 — ALIEN, low-level createReactiveSystem.
//
// The `notify(node)` hook IS the scheduler seam: when a signal changes,
// alien calls notify(dirtyNode) and we collect it in ONE place — the dirty
// set — instead of running anything. The render loop then flushes that set.
// This is the "reactivity graph decoupled from the render loop" property.
//
// HONESTY NOTE: createReactiveSystem is alien's primitive for building its
// OWN signal/computed/effect — NOT a documented public API for hand-rolled
// nodes. Driving it directly means owning the link-version/flag protocol,
// which is internal and version-fragile (re-running effects across frames
// needs the exact flag handshake alien's own effect() implements). So this
// strategy measures ONE propagate→notify pass per signal (which is sound and
// matches alien's probe behaviour) rather than a multi-frame re-run loop —
// that loop requires reproducing alien's private dirty-flag reset, which is
// exactly the fragility this note exists to flag.
// =============================================================================

interface SignalNode extends ReactiveNode {
  value: number
}
interface EffectNode extends ReactiveNode {
  run: () => void
}

function alienFrameLowLevel() {
  let collected = 0
  const dirty = new Set<EffectNode>()

  const sys = createReactiveSystem({
    update: () => false,
    notify: (node: ReactiveNode) => {
      // THE SEAM: a node went dirty. We collect, we don't run.
      dirty.add(node as EffectNode)
      collected++
    },
    unwatched: () => {},
  })

  let activeSub: EffectNode | undefined
  let painted = 0

  const makeSignal = (initial: number) => {
    const node: SignalNode = { value: initial, flags: ReactiveFlags.Mutable }
    const read = () => {
      if (activeSub) sys.link(node, activeSub, 0)
      return node.value
    }
    const write = (v: number) => {
      if (v === node.value) return
      node.value = v
      if (node.subs) sys.propagate(node.subs, false) // → calls our notify()
    }
    return { node, read, write }
  }

  const makeEffect = (body: () => void): EffectNode => {
    const node = { flags: ReactiveFlags.Watching, run: body } as EffectNode
    const prev = activeSub
    activeSub = node
    body()
    activeSub = prev
    return node
  }

  const sigs = Array.from({ length: N }, () => makeSignal(0))
  sigs.forEach(s => makeEffect(() => s.read()))

  const flush = () => {
    const batch = [...dirty]
    dirty.clear()
    for (const _ of batch) painted++ // "repaint" each dirty element once
  }

  // Fresh graph per measured frame (avoids the cross-frame flag-reset that
  // alien's own effect() owns and we deliberately don't reimplement).
  const ms = median(
    Array.from({ length: REPEAT }, () => {
      const fresh = Array.from({ length: N }, () => makeSignal(0))
      const effects = fresh.map(s => makeEffect(() => s.read()))
      void effects
      collected = 0
      painted = 0
      dirty.clear()
      const t = time(() => {
        for (let i = 0; i < CHANGES; i++) fresh[i]!.write(next())
        flush()
      })
      if (collected !== CHANGES || painted !== CHANGES)
        throw new Error(`alien-ll collected ${collected}/painted ${painted}, want ${CHANGES}`)
      return t
    }),
  )
  void sigs
  return ms
}

// =============================================================================
// run + report
// =============================================================================

console.log(`\nframe scheduler — coalesce ${CHANGES} cell changes → one paint pass`)
console.log(`N=${N} elements · median of ${REPEAT}\n`)

// warm
preactFrame()
alienFrameHighLevel()
alienFrameLowLevel()

const results: Array<[string, number, string]> = [
  ['preact (high-level, glue in effect)', preactFrame(), 'scheduler smeared across effect bodies'],
  ['alien  (high-level, glue in effect)', alienFrameHighLevel(), 'same pattern as preact'],
  ['alien  (low-level, notify = seam)', alienFrameLowLevel(), 'scheduler in ONE place (notify)'],
]

const pad = (s: string, n: number) => s.padEnd(n)
console.log(pad('strategy', 38) + pad('ms', 12) + 'where the scheduler lives')
console.log('─'.repeat(86))
for (const [name, ms, note] of results) {
  console.log(pad(name, 38) + pad(`${ms.toFixed(3)} ms`, 12) + note)
}
console.log(`\nTakeaway: high-level alien ≈ preact (both bolt mark-dirty onto effects).`)
console.log(`alien's "you own the schedule" advantage is the low-level notify seam —`)
console.log(`the dirty-collection lives in one place, not in every effect body.\n`)
