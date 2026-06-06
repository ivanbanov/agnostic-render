/**
 * React rendering — first render (mount) + re-render counting. DISPOSABLE.
 *
 * The ops/sec benchmarks measure engine work; this measures the thing that
 * actually hurts in a real app — how many React components render. Two numbers:
 *   - MOUNT      : rows rendered on first paint (the cost to put N rows on screen)
 *   - RE-RENDERS : rows that re-render when one machine in the list changes
 *                  (the fine-grained payoff made concrete).
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
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
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

export async function runRenderingBench(N: number, moves: number) {
  // Use flushSync (prod-safe) rather than React's `act`, which is stripped under
  // NODE_ENV=production (the suite runs in prod). flushSync runs the callback and
  // synchronously commits any resulting render, so render counts are deterministic.
  const results: Record<string, { mount: number; mountMs: number; renders: number; ms: number }> =
    {}

  for (const strategy of ['selector', 'naive'] as const) {
    const m = makeListMachine()
    m.start()
    const Row = strategy === 'selector' ? SelectorRow : NaiveRow
    renderCounts[strategy] = 0

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    // --- FIRST RENDER (mount): how many rows render on initial paint + how long.
    const mt0 = performance.now()
    flushSync(() => {
      root.render(
        <>
          {Array.from({ length: N }, (_, i) => (
            <Row key={i} m={m} index={i} />
          ))}
        </>,
      )
    })
    const mountMs = performance.now() - mt0
    const mount = renderCounts[strategy] // ← first-render count (was discarded as a baseline)

    // --- RE-RENDERS: move the highlight `moves` times, count rows re-rendered.
    const t0 = performance.now()
    for (let k = 0; k < moves; k++) {
      flushSync(() => {
        m.send({ type: 'move', to: k % N })
      })
    }
    const ms = performance.now() - t0
    const movesRenders = renderCounts[strategy] - mount

    results[strategy] = { mount, mountMs, renders: movesRenders, ms }
    flushSync(() => root.unmount())
    container.remove()
    m.stop()
  }

  console.log(`\n### Rendering — list of ${N}: first render (mount) + ${moves} highlight moves`)
  console.table(
    Object.entries(results).map(([k, v]) => ({
      strategy: k,
      'mount renders': v.mount,
      'mount (ms)': v.mountMs.toFixed(1),
      're-renders (total)': v.renders,
      'avg rows / move': (v.renders / moves).toFixed(1),
      're-render wall (ms)': v.ms.toFixed(1),
    })),
  )
}
