/**
 * Shared contender factories for the machine benchmark suite. DISPOSABLE —
 * built for a first look, expect to rebuild.
 *
 * Three reactive "cell" models, each exposing the same tiny interface so the
 * scenarios can drive them uniformly:
 *
 *   - core   : machine-core      → machine() + select(field).subscribe()  (intrinsic, auto-tracked)
 *   - store  : @xstate/store     → createStore + store.select(fn).subscribe (manual selector)
 *   - coarse : hand-rolled       → listener-Set snapshot store              (the O(all) model)
 *
 * Zag core is omitted from the fine-grained scenarios: its reactivity is
 * delegated to a host framework, so @zag-js/core has no standalone per-field
 * subscription to benchmark. The coarse store stands in for the
 * snapshot-and-diff / delegate-to-framework shape.
 */

import { createStore } from '@xstate/store'
import { machine, type Machine } from '../../packages/core/machine/src/index'

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
// Coarse baseline store
// -----------------------------------------------------------------------------
export function createCoarseStore<T extends object>(initial: T) {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set: (patch: Partial<T>) => {
      state = { ...state, ...patch }
      for (const l of listeners) l()
    },
    subscribe: (l: () => void) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
  }
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
// @xstate/store cell
// -----------------------------------------------------------------------------
export function makeStoreCell(observe = true): Cell {
  const s = createStore({
    context: { value: 0, other: 0 } as Ctx,
    on: {
      hit: (ctx: Ctx) => ({ ...ctx, value: ctx.value + 1 }),
      miss: (ctx: Ctx) => ({ ...ctx, other: ctx.other + 1 }),
    },
  })
  if (observe) s.select((c: Ctx) => c.value).subscribe(bump)
  return { hit: () => s.trigger.hit(), miss: () => s.trigger.miss() }
}

// -----------------------------------------------------------------------------
// coarse cell (snapshot + diff in the consumer)
// -----------------------------------------------------------------------------
export function makeCoarseCell(observe = true): Cell {
  const s = createCoarseStore<Ctx>({ value: 0, other: 0 })
  if (observe) {
    let last = s.get().value
    s.subscribe(() => {
      const v = s.get().value
      if (v !== last) {
        last = v
        bump()
      }
    })
  }
  return {
    hit: () => s.set({ value: s.get().value + 1 }),
    miss: () => s.set({ other: s.get().other + 1 }),
  }
}

export const CONTENDERS: Record<string, (observe?: boolean) => Cell> = {
  core: makeCoreCell,
  store: makeStoreCell,
  coarse: makeCoarseCell,
}
