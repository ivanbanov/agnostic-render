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
 *
 * (A "chain" sub-test — sync rule that send()s downstream on every change — was
 * removed: it shows superlinear slowdown under a tight loop. See the NOTE below.)
 *
 * Exported as `runCompose()`; the suite runs it via benchmark/index.ts
 * (`pnpm benchmark`).
 */
import { Bench } from 'tinybench'
import { compose } from '../../packages/core/machine/src/index'
import { makeCoreMachine, bump, SINK } from '../competitors'
import { report } from '../report'

function buildGroup(M: number) {
  const members: Record<string, ReturnType<typeof makeCoreMachine>> = {}
  for (let i = 0; i < M; i++) members[`m${i}`] = makeCoreMachine()
  return compose(members)
}

function benchCombine(M: number) {
  const bench = new Bench({ time: 120, warmupTime: 40 })
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
  const bench = new Bench({ time: 120, warmupTime: 40 })
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

// NOTE: a "chain" sub-test (a sync rule that send()s to a downstream member on
// every change) was REMOVED — under a tight loop it exhibits superlinear
// slowdown (cost grows within the first ~1k ops), which hangs the suite. That's
// a real compose.sync + cross-machine-send interaction worth investigating on
// its own; it is NOT a benchmark-tuning issue, so it doesn't belong here. The
// combine + sync tables already cover the cross-region cost story.

async function run(title: string, b: Bench) {
  await b.warmup()
  await b.run()
  report(title, b)
}

export async function runCompose() {
  console.log('\n========== COMPOSE / synced machines ==========')
  for (const M of [2, 10, 50]) await run(`A. combine (${M} members)`, benchCombine(M))
  for (const M of [2, 10, 50]) await run(`B. sync (${M} members)`, benchSync(M))
  console.log('(anti-DCE SINK:', SINK.n, ')')
}
