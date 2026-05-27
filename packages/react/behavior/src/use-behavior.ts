import {
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  createBehavior,
  type Behavior,
  type BehaviorConfig,
} from "@render-experiment/behavior-core";

/**
 * React reactivity bridge for a behavior instance.
 *
 * Owns the lifecycle (start on mount, stop on unmount) and re-renders via
 * `useSyncExternalStore`, using the behavior's monotonic version counter
 * as the snapshot. `Number === Number` is allocation-free and avoids
 * serializing the context on every render.
 *
 * `props` are forwarded every render so controlled-mode flags (`open`),
 * callbacks (`onOpenChange`), and timing knobs (`openDelay`) stay fresh
 * inside actions/guards/effects.
 */
export function useBehavior<TContext extends object, TProps extends object>(
  config: BehaviorConfig<TContext, TProps>,
  props: TProps,
): Behavior<TContext, TProps> {
  const configRef = useRef(config);
  const behavior = useMemo(
    () => createBehavior(configRef.current, props),
    // Behavior is created once; subsequent config or props updates flow
    // through setProps below — recreating would lose state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  behavior.setProps(props);

  useEffect(() => {
    behavior.start();
    return () => behavior.stop();
  }, [behavior]);

  useSyncExternalStore(
    (notify) => behavior.subscribe(notify),
    () => behavior.getVersion(),
    () => behavior.getVersion(),
  );

  return behavior;
}
