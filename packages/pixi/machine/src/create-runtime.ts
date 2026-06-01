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

import type { Connect, MachineConfig } from '@render-experiment/machine-core'
import { createMachineRuntime, type MachineRuntime } from './runtime'

export interface Runtime<TContext extends object, TProps extends object, TApi> {
  runtime: MachineRuntime<TContext, TProps>
  /** Latest connect() output; cached by machine version. */
  getApi: () => TApi
}

export function createRuntime<TContext extends object, TProps extends object, TState, TApi>(
  config: MachineConfig<TContext, TProps>,
  props: TProps,
  connect: Connect<TState, TContext, TProps, TApi, []>,
): Runtime<TContext, TProps, TApi> {
  const runtime = createMachineRuntime<TContext, TProps>(config, props)
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
