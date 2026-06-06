/**
 * Fan-out + fine-grain + throughput. DISPOSABLE first-look benchmark.
 *
 *   A. PROPAGATION  — N cells, change ONE. Does cost stay flat (O(changed)) or
 *      degrade with N? Each contender uses one independent machine per cell.
 *   B. FINE-GRAIN   — change a field NOBODY observes. Auto-tracked engines do
 *      ~zero subscriber work.
 *   C. THROUGHPUT   — one cell, fire one event. Per-transition cost (where
 *      signals may LOSE to a plain store reducer).
 *
 * Contenders (both SYNCHRONOUS statecharts, so the ops/sec loop is fair): core,
 * xstate (real statechart, coarse headless subscribe).
 *
 * Not here: Zag — its headless `send` is async/microtask-batched, so it can't
 * share a synchronous loop. Zag is in the React render benchmark instead.
 *
 * Exported as `runFanout()`; the suite runs it via benchmark/index.ts
 * (`pnpm benchmark`).
 */
import { Bench } from 'tinybench'
import { makeCoreCell, makeXstateCell, SINK, type Cell } from '../competitors'
import { report } from '../report'

const CONTENDERS: Array<[string, (observe?: boolean) => Cell]> = [
  ['core  ', makeCoreCell],
  ['xstate', makeXstateCell],
]

function benchPropagation(N: number) {
  const bench = new Bench({ time: 120, warmupTime: 40 })
  for (const [label, make] of CONTENDERS) {
    const cells = Array.from({ length: N }, () => make())
    let i = 0
    bench.add(`${label} 1/${N}`, () => {
      cells[i++ % N].hit()
    })
  }
  return bench
}

function benchFineGrain(N: number) {
  const bench = new Bench({ time: 120, warmupTime: 40 })
  for (const [label, make] of CONTENDERS) {
    const cells = Array.from({ length: N }, () => make())
    let i = 0
    bench.add(`${label} miss 1/${N}`, () => {
      cells[i++ % N].miss()
    })
  }
  return bench
}

function benchThroughput() {
  const bench = new Bench({ time: 150, warmupTime: 40 })
  for (const [label, make] of CONTENDERS) {
    const c = make()
    bench.add(`${label} single-event`, () => c.hit())
  }
  return bench
}

async function run(title: string, b: Bench) {
  await b.warmup()
  await b.run()
  report(title, b)
}

export async function runFanout() {
  console.log('\n========== FAN-OUT / fine-grain / throughput ==========')
  for (const N of [100, 1000, 5000])
    await run(`A. Propagation — change 1 of ${N}`, benchPropagation(N))
  for (const N of [1000, 5000])
    await run(`B. Fine-grain — change an UNOBSERVED field, ${N} cells`, benchFineGrain(N))
  await run('C. Throughput — single machine, one event', benchThroughput())
  console.log('(anti-DCE SINK:', SINK.n, ')')
}
