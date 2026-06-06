/**
 * Construction cost. DISPOSABLE first-look benchmark.
 *
 * "Cheaper to create than XState" is a claim the README makes — this times it.
 * Builds N machines/actors and measures wall-clock for construction alone
 * (no events sent). Both started, to match a real mount.
 *
 *   core   : machine(config) + .start()
 *   xstate : createActor(createMachine(config)) + .start()
 *
 * Exported as `runConstruct()`; the suite runs it via benchmark/index.ts
 * (`pnpm benchmark`).
 */
import { createActor, createMachine as createXMachine, assign } from 'xstate'
import { machine } from '../packages/core/machine/src/index'

type Ctx = { value: number; other: number }
type Ev = { type: 'hit' | 'miss' }

function buildCore() {
  const m = machine<'idle', Ctx, Ev>({
    initial: 'idle',
    context: { value: 0, other: 0 },
    states: {
      idle: {
        on: {
          hit: { actions: [({ context, setContext }) => setContext({ value: context.value + 1 })] },
          miss: {
            actions: [({ context, setContext }) => setContext({ other: context.other + 1 })],
          },
        },
      },
    },
  })
  m.start()
  return m
}

function buildXstate() {
  const def = createXMachine({
    context: { value: 0, other: 0 },
    on: {
      hit: { actions: assign({ value: ({ context }) => context.value + 1 }) },
      miss: { actions: assign({ other: ({ context }) => context.other + 1 }) },
    },
  })
  const a = createActor(def)
  a.start()
  return a
}

const SINK: unknown[] = []

function time(label: string, N: number, build: () => unknown): number {
  // warm the JIT
  for (let i = 0; i < 1000; i++) SINK.push(build())
  SINK.length = 0
  const t0 = performance.now()
  for (let i = 0; i < N; i++) SINK.push(build())
  const ms = performance.now() - t0
  SINK.length = 0 // drop refs before next contender
  return ms
}

export async function runConstruct() {
  console.log('\n========== CONSTRUCTION COST ==========')
  for (const N of [1000, 10000]) {
    const core = time('core', N, buildCore)
    const xstate = time('xstate', N, buildXstate)
    console.log(`\n### Construct ${N.toLocaleString()} machines (built + started)`)
    console.table([
      {
        engine: 'core',
        'total (ms)': core.toFixed(1),
        'µs / machine': ((core / N) * 1000).toFixed(2),
      },
      {
        engine: 'xstate',
        'total (ms)': xstate.toFixed(1),
        'µs / machine': ((xstate / N) * 1000).toFixed(2),
      },
    ])
  }
  console.log('(anti-DCE SINK len:', SINK.length, ')')
}
