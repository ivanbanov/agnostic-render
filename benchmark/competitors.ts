/**
 * Shared competitor factories for the machine benchmark suite. DISPOSABLE —
 * built for a first look, expect to rebuild.
 *
 * Reactive "cell" models for the HEADLESS tables — the two real STATECHARTS,
 * exposing the same tiny interface so the scenarios can drive them uniformly:
 *
 *   - core   : machine-core   → machine() + select(field).subscribe()  (intrinsic, auto-tracked)
 *   - xstate : xstate          → createActor + actor.subscribe (COARSE)  (the real statechart)
 *
 * Both are SYNCHRONOUS, so they share the synchronous ops/sec loop fairly.
 * (@xstate/store is intentionally NOT here — it's a store, not a statechart.)
 *
 * NOTE on what's NOT here:
 *   - xstate's headless subscription (actor.subscribe) is COARSE — fine-grained
 *     selection in XState is `useSelector`, which is React-only; it shows up in
 *     the React render benchmark instead.
 *   - Zag's headless `send` (via @zag-js/vanilla VanillaMachine) is ASYNC —
 *     microtask-batched — so it can't share a synchronous ops/sec loop fairly.
 *     Zag is measured in the React render benchmark only (mount + re-render),
 *     where it runs natively via @zag-js/react.
 */

import { createActor, createMachine as createXMachine, assign } from 'xstate'
import { machine, type Machine } from '../packages/core/machine/src/index'

/** A sink so subscriber work isn't dead-code-eliminated by the JIT. */
export const SINK = { n: 0 }
export const bump = () => {
  SINK.n++
}

export interface Cell {
  /** Change the OBSERVED field (`value`). */
  hit: () => void
  /** Change an UNOBSERVED field (`other`) — for the fine-grain / irrelevant test. */
  miss: () => void
}

// -----------------------------------------------------------------------------
// machine-core cell
// -----------------------------------------------------------------------------
type Ctx = { value: number; other: number }
type Ev = { type: 'hit' | 'miss' }

export function makeCoreMachine(): Machine<'idle', Ctx, Ev> {
  return machine<'idle', Ctx, Ev>({
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
}

export function makeCoreCell(observe = true): Cell {
  const m = makeCoreMachine()
  m.start()
  if (observe) m.select.context('value').subscribe(bump)
  return { hit: () => m.send({ type: 'hit' }), miss: () => m.send({ type: 'miss' }) }
}

// -----------------------------------------------------------------------------
// xstate cell — the real statechart (createMachine + createActor).
// actor.subscribe is COARSE (fires on every snapshot change). We diff `value`
// in the listener, the same shape the coarse store uses, so the headless number
// reflects XState's actual headless subscription behavior.
// -----------------------------------------------------------------------------
export function makeXstateCell(observe = true): Cell {
  const m = createXMachine({
    context: { value: 0, other: 0 },
    on: {
      hit: { actions: assign({ value: ({ context }) => context.value + 1 }) },
      miss: { actions: assign({ other: ({ context }) => context.other + 1 }) },
    },
  })
  const a = createActor(m)
  a.start()
  if (observe) {
    let last = a.getSnapshot().context.value
    a.subscribe(snap => {
      const v = snap.context.value
      if (v !== last) {
        last = v
        bump()
      }
    })
  }
  return { hit: () => a.send({ type: 'hit' }), miss: () => a.send({ type: 'miss' }) }
}

export const CONTENDERS: Record<string, (observe?: boolean) => Cell> = {
  core: makeCoreCell,
  xstate: makeXstateCell,
}
