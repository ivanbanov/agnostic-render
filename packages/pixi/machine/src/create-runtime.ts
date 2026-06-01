/**
 * Spin up a Pixi machine runtime and pair it with a connect() function.
 * Returns `getApi()` that caches its result by the machine's version
 * counter so calling it many times per frame (e.g., from render loops)
 * doesn't re-allocate the api object until a transition actually fires.
 *
 *   const { runtime, getApi } = createRuntime(
 *     tooltipMachineWithAdapter,
 *     props,
 *     connectTooltip,
 *   );
 *   runtime.subscribe(() => positionOverlay(getApi()));
 */

import type { Connect, EventObject, MachineConfig } from '@render-experiment/machine-core'
import { createMachineRuntime, type MachineRuntime } from './runtime'

export interface Runtime<
  TContext extends object,
  TProps extends object,
  TApi,
  TEvent extends EventObject = EventObject,
> {
  runtime: MachineRuntime<TContext, TProps, TEvent>
  /** Latest connect() output; cached by machine version. */
  getApi: () => TApi
}

export function createRuntime<
  TContext extends object,
  TProps extends object,
  TState,
  TApi,
  TEvent extends EventObject = EventObject,
>(
  config: MachineConfig<TContext, TProps, TEvent>,
  props: TProps,
  connect: Connect<TState, TContext, TProps, TApi, [], TEvent>,
): Runtime<TContext, TProps, TApi, TEvent> {
  const runtime = createMachineRuntime<TContext, TProps, TEvent>(config, props)
  const { machine } = runtime

  let cachedVersion = -1
  let cachedApi: TApi | undefined

  const getApi = (): TApi => {
    const version = machine.getVersion()
    if (cachedApi !== undefined && version === cachedVersion) {
      return cachedApi
    }
    cachedVersion = version
    cachedApi = connect({
      state: machine.getState() as TState,
      context: machine.getContext(),
      props: machine.getProps(),
      send: machine.send,
    })()
    return cachedApi
  }

  return { runtime, getApi }
}
