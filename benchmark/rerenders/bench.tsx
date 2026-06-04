/**
 * React re-render counting. DISPOSABLE first-look benchmark.
 *
 * The ops/sec benchmarks measure engine work; this measures the thing that
 * actually hurts in a real app — how many React components RE-RENDER when one
 * machine in a big list changes. This is the fine-grained payoff made concrete.
 *
 * Setup: a list of N items, each backed by its own machine. Two strategies:
 *
 *   A. coarse (whole snapshot) — each item renders off the connector's snapshot
 *      via useSyncExternalStore (what useMachine does per instance). Change one
 *      item → only that item's store wakes (each has its own machine), so this
 *      is already decent — we measure it as the baseline.
 *   B. selector (useSelector) — a SHARED machine whose context holds an array /
 *      a highlighted index; N children each useSelector on "am I highlighted?".
 *      Move the highlight: with fine-grained selection only the 2 affected rows
 *      re-render; a naive whole-snapshot subscription re-renders all N.
 *
 * We count renders by incrementing a per-row counter in the component body.
 *
 * Run with jsdom registered:
 *   pnpm tsx --conditions=browser benchmark/rerenders/run.ts
 * (run.ts sets up jsdom then imports this)
 */
import React, { useRef } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { machine, type Machine } from '../../packages/core/machine/src/index'
import { useSelector } from '../../packages/react/machine/src/use-selector'

type Ctx = { highlighted: number }
type Ev = { type: 'move'; to: number }

function makeListMachine(): Machine<'idle', Ctx, Ev> {
  return machine<'idle', Ctx, Ev>({
    initial: 'idle',
    context: { highlighted: 0 },
    states: {
      idle: {
        on: {
          move: { actions: [({ event, setContext }) => setContext({ highlighted: event.to })] },
        },
      },
    },
  })
}

const renderCounts = { selector: 0, naive: 0 }

// Fine-grained row: re-renders only when ITS highlighted-ness flips.
function SelectorRow({ m, index }: { m: Machine<'idle', Ctx, Ev>; index: number }) {
  const isHL = useSelector(m, () => m.context.highlighted === index)
  renderCounts.selector++
  return <div data-hl={isHL ? '1' : '0'}>{index}</div>
}

// Naive row: subscribes to the WHOLE context (reads highlighted directly each
// render and re-renders on any change) — the O(all) React shape.
function NaiveRow({ m, index }: { m: Machine<'idle', Ctx, Ev>; index: number }) {
  // read the whole highlighted value (not "=== index"), so every move re-renders every row
  const hl = useSelector(m, () => m.context.highlighted)
  renderCounts.naive++
  return <div data-hl={hl === index ? '1' : '0'}>{index}</div>
}

export async function runRerenderBench(N: number, moves: number) {
  const results: Record<string, { renders: number; ms: number }> = {}

  for (const strategy of ['selector', 'naive'] as const) {
    const m = makeListMachine()
    m.start()
    const Row = strategy === 'selector' ? SelectorRow : NaiveRow
    renderCounts[strategy] = 0

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(
        <>
          {Array.from({ length: N }, (_, i) => (
            <Row key={i} m={m} index={i} />
          ))}
        </>,
      )
    })

    const afterMount = renderCounts[strategy]
    const t0 = performance.now()
    for (let k = 0; k < moves; k++) {
      await act(async () => {
        m.send({ type: 'move', to: k % N })
      })
    }
    const ms = performance.now() - t0
    const movesRenders = renderCounts[strategy] - afterMount

    results[strategy] = { renders: movesRenders, ms }
    await act(async () => root.unmount())
    container.remove()
    m.stop()
  }

  console.log(`\n### React re-renders — list of ${N}, ${moves} highlight moves`)
  console.table(
    Object.entries(results).map(([k, v]) => ({
      strategy: k,
      'rows re-rendered (total over moves)': v.renders,
      'avg rows / move': (v.renders / moves).toFixed(1),
      'wall (ms)': v.ms.toFixed(1),
    })),
  )
}
