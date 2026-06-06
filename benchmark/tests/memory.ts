/**
 * Memory per machine. DISPOSABLE first-look benchmark.
 *
 * The central claim — "flat memory at 5k scale, even with fat context" (the
 * trading-view case) — asserted in the README with no script until now. This
 * measures it: build N machines, hold them live, report retained heap / machine.
 *
 * Two context widths, because the whole point of the plain-object + COW model is
 * that memory should stay ~flat in FIELD COUNT (no per-field reactive cell):
 *   - thin :  2 fields
 *   - fat  : 64 fields   (the case that would blow up a cell-per-field engine)
 *
 * Needs accurate GC (--expose-gc); the suite (`pnpm benchmark`) passes it.
 * Exported as `runMemory()`; run via benchmark/index.ts.
 *
 * heapMB() force-GCs before sampling (no-op without --expose-gc — it'll WARN).
 */
import { createActor, createMachine as createXMachine, assign } from 'xstate'
import { machine } from '../../packages/core/machine/src/index'
import { heapMB } from '../report'

const FIELDS = { thin: 2, fat: 64 } as const

function makeContext(n: number): Record<string, number> {
  const ctx: Record<string, number> = {}
  for (let i = 0; i < n; i++) ctx[`f${i}`] = 0
  return ctx
}

function buildCore(fields: number) {
  const context = makeContext(fields)
  const m = machine({
    initial: 'idle',
    context,
    states: {
      idle: {
        on: {
          hit: { actions: [({ context: c, setContext }) => setContext({ f0: c.f0 + 1 })] },
        },
      },
    },
  })
  m.start()
  return m
}

function buildXstate(fields: number) {
  const context = makeContext(fields)
  const def = createXMachine({
    context,
    on: { hit: { actions: assign({ f0: ({ context: c }) => c.f0 + 1 }) } },
  })
  const a = createActor(def)
  a.start()
  return a
}

const ENGINES: Record<string, (fields: number) => unknown> = {
  core: buildCore,
  xstate: buildXstate,
}

function measure(build: (fields: number) => unknown, N: number, fields: number): number {
  const before = heapMB()
  const hold: unknown[] = new Array(N)
  for (let i = 0; i < N; i++) hold[i] = build(fields)
  const after = heapMB()
  // keep `hold` reachable across the sample so it isn't collected
  if ((hold as unknown[]).length !== N) throw new Error('unreachable')
  return after - before // MB retained by the N machines
}

export async function runMemory() {
  console.log('\n========== MEMORY PER MACHINE ==========')
  if (!global.gc) {
    console.warn('⚠️  no --expose-gc — numbers are noisy (the suite passes it for you).')
  }
  const N = 5000
  for (const [width, fields] of Object.entries(FIELDS)) {
    console.log(
      `\n### Memory — ${N.toLocaleString()} machines, ${width} context (${fields} fields)`,
    )
    const rows = Object.entries(ENGINES).map(([engine, build]) => {
      const mb = measure(build, N, fields)
      return {
        engine,
        'total (MB)': mb.toFixed(1),
        'KB / machine': ((mb * 1024) / N).toFixed(2),
      }
    })
    console.table(rows)
  }
}
