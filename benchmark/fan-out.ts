/**
 * Fan-out + fine-grain + throughput. DISPOSABLE first-look benchmark.
 *
 *   A. PROPAGATION  — N cells, change ONE. Does cost stay flat (O(changed)) or
 *      scale with N (O(all))? The coarse variant uses a SHARED store with N
 *      subscribers (the realistic "one store, many readers" O(all) shape).
 *   B. FINE-GRAIN   — change a field NOBODY observes. The auto-tracked engines
 *      should do ~zero subscriber work; coarse still wakes everyone.
 *   C. THROUGHPUT   — one cell, fire one event. Per-transition cost (where
 *      signals may LOSE to a plain reducer).
 *
 * Run: pnpm tsx benchmark/fan-out/bench.ts
 */
import { Bench } from 'tinybench'
import {
  createCoarseStore,
  makeCoreCell,
  makeStoreCell,
  makeCoarseCell,
  bump,
  SINK,
} from '../lib/contenders'
import { report } from '../lib/report'

function benchPropagation(N: number) {
  const bench = new Bench({ time: 400, warmupTime: 100 })

  {
    const cells = Array.from({ length: N }, () => makeCoreCell())
    let i = 0
    bench.add(`core   1/${N}`, () => {
      cells[i++ % N].hit()
    })
  }
  {
    const cells = Array.from({ length: N }, () => makeStoreCell())
    let i = 0
    bench.add(`store  1/${N}`, () => {
      cells[i++ % N].hit()
    })
  }
  {
    // coarse SHARED store, N subscribers → one change wakes all N (O(all))
    const s = createCoarseStore({ value: 0, other: 0 })
    for (let k = 0; k < N; k++) {
      let last = s.get().value
      s.subscribe(() => {
        const v = s.get().value
        if (v !== last) {
          last = v
          bump()
        }
      })
    }
    bench.add(`coarse 1/${N} (shared, N subs)`, () => {
      s.set({ value: s.get().value + 1 })
    })
  }
  return bench
}

function benchFineGrain(N: number) {
  // N cells observing `value`; we repeatedly change `other` (unobserved).
  // Auto-tracked: subscriber never fires. Coarse-shared: still wakes all N.
  const bench = new Bench({ time: 400, warmupTime: 100 })
  {
    const cells = Array.from({ length: N }, () => makeCoreCell())
    let i = 0
    bench.add(`core   miss 1/${N}`, () => {
      cells[i++ % N].miss()
    })
  }
  {
    const cells = Array.from({ length: N }, () => makeStoreCell())
    let i = 0
    bench.add(`store  miss 1/${N}`, () => {
      cells[i++ % N].miss()
    })
  }
  {
    const s = createCoarseStore({ value: 0, other: 0 })
    for (let k = 0; k < N; k++) {
      let last = s.get().value
      s.subscribe(() => {
        const v = s.get().value
        if (v !== last) {
          last = v
          bump()
        }
      })
    }
    bench.add(`coarse miss 1/${N} (shared, N subs)`, () => {
      s.set({ other: s.get().other + 1 })
    })
  }
  return bench
}

function benchThroughput() {
  const bench = new Bench({ time: 500, warmupTime: 100 })
  const core = makeCoreCell(),
    store = makeStoreCell(),
    coarse = makeCoarseCell()
  bench.add('core   single-event', () => core.hit())
  bench.add('store  single-event', () => store.hit())
  bench.add('coarse single-event', () => coarse.hit())
  return bench
}

async function run(title: string, b: Bench) {
  await b.warmup()
  await b.run()
  report(title, b)
}

async function main() {
  console.log('Fan-out / fine-grain / throughput (disposable). Node', process.version)
  for (const N of [100, 1000, 5000])
    await run(`A. Propagation — change 1 of ${N}`, benchPropagation(N))
  for (const N of [1000, 5000])
    await run(`B. Fine-grain — change an UNOBSERVED field, ${N} cells`, benchFineGrain(N))
  await run('C. Throughput — single machine, one event', benchThroughput())
  console.log('\n(anti-DCE SINK:', SINK.n, ')')
}
main()
