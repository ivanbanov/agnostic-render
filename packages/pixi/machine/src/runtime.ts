/**
 * Pixi machine runtime — imperative wrapper around a core machine.
 *
 * No hooks. No React. Caller owns lifecycle:
 *
 *   const runtime = createMachineRuntime(config, props);
 *   runtime.subscribe(() => { /* re-derive / re-render *​/ });
 *   runtime.machine.send({ type: "..." });
 *   runtime.dispose();
 *
 * Mechanically identical to what useMachine does on React: a version
 * counter bumps on every state transition or context change.
 * Subscribers compare the counter and decide whether to re-derive
 * the connect() API.
 */
import {
  createMachine,
  type Machine,
  type MachineConfig,
} from "@render-experiment/machine-core";

export interface MachineRuntime<TContext extends object, TProps extends object> {
  machine: Machine<TContext, TProps>;
  /** Register a listener invoked on every state or context change. */
  subscribe: (listener: () => void) => () => void;
  /** Push new props into the machine (controlled mode, callback freshness). */
  setProps: (next: TProps) => void;
  /** Stop the machine + clean up effects. Idempotent. */
  dispose: () => void;
}

export function createMachineRuntime<
  TContext extends object,
  TProps extends object,
>(
  config: MachineConfig<TContext, TProps>,
  props: TProps,
): MachineRuntime<TContext, TProps> {
  const machine = createMachine(config, props);
  machine.start();

  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    machine.stop();
  };

  return {
    machine,
    subscribe: machine.subscribe,
    setProps: machine.setProps,
    dispose,
  };
}
