/**
 * alien-signals vs @preact/signals-core — fine-grained reactivity bench.
 *
 * Goal: prove (or disprove) that a per-cell signal kernel gives O(changed)
 * updates at the scale this project targets — ~5,000 independently-stateful
 * elements (canvas / TUI), where changing ONE cell must touch only the
 * element(s) that read it, not all 5,000.
 *
 * What each scenario simulates for our use case:
 *   build        — mounting 5k elements, each subscribing to its own cell
 *   singleUpdate — one element's state changes (hover/highlight one item)
 *                  → MUST fire 1 effect, not N. This is the O(changed) claim.
 *   batchedFrame — a busy frame: 1,000 cells change, flushed once
 *   wideFanout   — one shared cell (e.g. a theme/zoom) read by all 5k
 *                  elements changes → worst-case notify spread
 *   teardown     — unmount all 5k (dispose every effect)
 *
 * Each scenario asserts the fire-count so the latency numbers can't lie
 * (e.g. singleUpdate asserts exactly 1 effect ran).
 *
 * IMPORTANT: each scenario builds its OWN fresh signal graph and always
 * writes a strictly-increasing value. Both libs dedup by value (setting a
 * signal to its current value fires nothing), so sharing signals across
 * scenarios would undercount fires. Fresh graph per scenario avoids that.
 *
 * Not a scientific benchmark — a decision spike. Run a few times; look at
 * orders of magnitude, not 3rd-decimal differences. Microbench != real
 * render loop, but it does verify propagation is O(changed).
 */

import * as alien from 'alien-signals'
import * as preact from '@preact/signals-core'

const N = 5_000
const FRAME_CHANGES = 1_000
const REPEAT = 5 // median of N runs to dampen GC/JIT noise

// A monotonically increasing value source so every write is a real change
// (defeats value-dedup in both libs).
let TICK = 1
const next = () => TICK++

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]!
}

function time(fn: () => void): number {
  const t0 = performance.now()
  fn()
  return performance.now() - t0
}

// A minimal lib adapter so both harnesses share identical scenario logic.
interface Kernel {
  name: string
  buildGraph(
    n: number,
    onFire: () => void,
  ): { set: (i: number, v: number) => void; dispose: () => void }
  buildShared(n: number, onFire: () => void): { set: (v: number) => void; dispose: () => void }
  batch(fn: () => void): void
}

const alienKernel: Kernel = {
  name: 'alien',
  buildGraph(n, onFire) {
    const sigs: Array<(v?: number) => number> = []
    const disposers: Array<() => void> = []
    for (let i = 0; i < n; i++) {
      const s = alien.signal(0)
      sigs.push(s as (v?: number) => number)
      disposers.push(
        alien.effect(() => {
          s()
          onFire()
        }),
      )
    }
    return {
      set: (i, v) => (sigs[i] as (v: number) => void)(v),
      dispose: () => disposers.forEach(d => d()),
    }
  },
  buildShared(n, onFire) {
    const shared = alien.signal(0)
    const disposers = Array.from({ length: n }, () =>
      alien.effect(() => {
        shared()
        onFire()
      }),
    )
    return {
      set: v => (shared as (v: number) => void)(v),
      dispose: () => disposers.forEach(d => d()),
    }
  },
  batch(fn) {
    alien.startBatch()
    fn()
    alien.endBatch()
  },
}

const preactKernel: Kernel = {
  name: 'preact',
  buildGraph(n, onFire) {
    const sigs: Array<preact.Signal<number>> = []
    const disposers: Array<() => void> = []
    for (let i = 0; i < n; i++) {
      const s = preact.signal(0)
      sigs.push(s)
      disposers.push(
        preact.effect(() => {
          s.value
          onFire()
        }),
      )
    }
    return {
      set: (i, v) => {
        sigs[i]!.value = v
      },
      dispose: () => disposers.forEach(d => d()),
    }
  },
  buildShared(n, onFire) {
    const shared = preact.signal(0)
    const disposers = Array.from({ length: n }, () =>
      preact.effect(() => {
        shared.value
        onFire()
      }),
    )
    return {
      set: v => {
        shared.value = v
      },
      dispose: () => disposers.forEach(d => d()),
    }
  },
  batch(fn) {
    preact.batch(fn)
  },
}

interface Result {
  build: number
  single: number
  frame: number
  wide: number
  teardown: number
}

function run(k: Kernel): Result {
  let fires = 0
  const onFire = () => fires++

  // build (each effect runs once during creation)
  let graph!: ReturnType<Kernel['buildGraph']>
  const build = time(() => {
    graph = k.buildGraph(N, onFire)
  })

  // single-cell update → exactly 1 fire
  const single = median(
    Array.from({ length: REPEAT }, (_, r) => {
      fires = 0
      const ms = time(() => graph.set(r % N, next()))
      if (fires !== 1) throw new Error(`${k.name} single fired ${fires}, expected 1`)
      return ms
    }),
  )

  // batched frame → FRAME_CHANGES fires, one flush
  const frame = median(
    Array.from({ length: REPEAT }, () => {
      fires = 0
      const ms = time(() => {
        k.batch(() => {
          for (let i = 0; i < FRAME_CHANGES; i++) graph.set(i, next())
        })
      })
      if (fires !== FRAME_CHANGES)
        throw new Error(`${k.name} frame fired ${fires}, expected ${FRAME_CHANGES}`)
      return ms
    }),
  )

  const teardown = time(() => graph.dispose())

  // wide fan-out: 1 shared signal read by all N effects → N fires per change
  let wfFires = 0
  const shared = k.buildShared(N, () => wfFires++)
  const wide = median(
    Array.from({ length: REPEAT }, () => {
      wfFires = 0
      const ms = time(() => shared.set(next()))
      if (wfFires !== N) throw new Error(`${k.name} wide fired ${wfFires}, expected ${N}`)
      return ms
    }),
  )
  shared.dispose()

  return { build, single, frame, wide, teardown }
}

// -----------------------------------------------------------------------------
// run + report
// -----------------------------------------------------------------------------

console.log(`\nalien-signals vs @preact/signals-core`)
console.log(`N=${N} elements · frame=${FRAME_CHANGES} changes · median of ${REPEAT}\n`)

// warm JIT
run(alienKernel)
run(preactKernel)

const a = run(alienKernel)
const p = run(preactKernel)

const scenarios: Array<[string, keyof Result]> = [
  ['build 5k signal+effect', 'build'],
  ['single-cell update (1 fire)', 'single'],
  [`batched frame (${FRAME_CHANGES} fires)`, 'frame'],
  [`wide fan-out (1→${N} fires)`, 'wide'],
  ['teardown 5k', 'teardown'],
]

const pad = (s: string, n: number) => s.padEnd(n)
const ms = (n: number) => `${n.toFixed(3)} ms`
console.log(pad('scenario', 32) + pad('alien', 14) + pad('preact', 14) + 'winner')
console.log('─'.repeat(72))
for (const [label, key] of scenarios) {
  const av = a[key]
  const pv = p[key]
  const winner =
    Math.abs(av - pv) < 0.01
      ? '≈ tie'
      : av < pv
        ? `alien (${(pv / av).toFixed(1)}×)`
        : `preact (${(av / pv).toFixed(1)}×)`
  console.log(pad(label, 32) + pad(ms(av), 14) + pad(ms(pv), 14) + winner)
}
console.log('\nKey check: single-cell update fires exactly 1 effect on both →')
console.log('O(changed), not O(N). That is the property this project needs.\n')
