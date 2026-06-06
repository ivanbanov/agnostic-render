/**
 * Chained / synced machines. DISPOSABLE first-look benchmark.
 *
 * Exercises the cross-region machinery `compose` adds:
 *
 *   A. COMBINE   — one value-deduped Selection derived across M members. Change
 *      ONE member's observed field; only the combined selection should recompute.
 *      Scaled by member count to see if combine cost grows with M.
 *   B. SYNC      — a coarse cross-region rule (wakes on ANY member change). This
 *      is the O(members) path by design; measured so its cost is visible vs.
 *      combine's fine-grained path.
 *   C. CHAIN     — a sync rule that, on member A's change, send()s to member B
 *      (a realistic "when popup closes, close submenu"). Measures the full
 *      cross-machine hop cost, including run-to-completion.
 *
 * Run: pnpm tsx benchmark/compose/bench.ts
 */
import { Bench } from 'tinybench'
import { compose } from '../packages/core/machine/src/index'
import { makeCoreMachine, bump, SINK } from './lib/contenders'
import { report } from './lib/report'

function buildGroup(M: number) {
  const members: Record<string, ReturnType<typeof makeCoreMachine>> = {}
  for (let i = 0; i < M; i++) members[`m${i}`] = makeCoreMachine()
  return compose(members)
}

function benchCombine(M: number) {
  const bench = new Bench({ time: 400, warmupTime: 100 })
  const g = buildGroup(M)
  g.start()
  const keys = Object.keys(g.members)
  // combine reads ONE member's value; only that read field should wake it
  const sel = g.combine(() => g.members.m0.context.value)
  sel.subscribe(bump)
  let i = 0
  bench.add(`combine — change 1 of ${M} members (only m0 observed)`, () => {
    // rotate which member we hit; only m0's change should fire the combine
    g.members[keys[i++ % M]].send({ type: 'hit' })
  })
  return bench
}

function benchSync(M: number) {
  const bench = new Bench({ time: 400, warmupTime: 100 })
  const g = buildGroup(M)
  g.start()
  const keys = Object.keys(g.members)
  g.sync(bump) // coarse: any member change wakes this
  let i = 0
  bench.add(`sync — coarse rule over ${M} members`, () => {
    g.members[keys[i++ % M]].send({ type: 'hit' })
  })
  return bench
}

function benchChain(M: number) {
  const bench = new Bench({ time: 400, warmupTime: 100 })
  const g = buildGroup(M)
  g.start()
  const keys = Object.keys(g.members)
  // chain: when ANY member changes, push an event to a DOWNSTREAM member.
  // Re-entrancy guard: the downstream send itself triggers `sync` again (sync is
  // coarse — fires on any member change), so without the flag this recurses
  // forever. A real chain rule guards the same way (act on the upstream change,
  // ignore your own downstream write).
  let chaining = false
  g.sync(() => {
    if (chaining) return
    chaining = true
    bump()
    g.members.m1.send({ type: 'miss' }) // a downstream hop
    chaining = false
  })
  let i = 0
  bench.add(`chain — change → cross-machine send (${M} members)`, () => {
    g.members[keys[i++ % M]].send({ type: 'hit' })
  })
  return bench
}

async function run(title: string, b: Bench) {
  await b.warmup()
  await b.run()
  report(title, b)
}

async function main() {
  console.log('Compose / synced machines (disposable). Node', process.version)
  for (const M of [2, 10, 50]) await run(`A. combine (${M} members)`, benchCombine(M))
  for (const M of [2, 10, 50]) await run(`B. sync (${M} members)`, benchSync(M))
  for (const M of [2, 10]) await run(`C. chain (${M} members)`, benchChain(M))
  console.log('\n(anti-DCE SINK:', SINK.n, ')')
}
main()
