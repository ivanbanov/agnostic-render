/**
 * Reactive store with a Zustand-shaped surface.
 *
 *   const store = createStore({ count: 0 });
 *   store.subscribe((s) => console.log("state →", s));
 *   store.setState({ count: 1 });             // partial merge
 *   store.setState((s) => ({ count: s.count + 1 }));
 *   store.setState({ count: 10 }, true);      // replace, no merge
 *
 * Design rules:
 *   - Reference-equality short-circuit: setState compares the new state
 *     to the previous with `Object.is` and skips notification when
 *     they're the same. Consumers can still pass a custom equality
 *     function at the selector level (see `useStore`).
 *   - No selector primitive — that's a consumer concern. The React
 *     binding's `useStore(store, selector, equalityFn)` handles it.
 *   - `setStateSilent` exists for the rare case where state must be
 *     synced during a render phase before children read it. Don't
 *     reach for it as a perf hack.
 */

export type Listener<T> = (state: T) => void;
export type SetStateAction<T, S = T> = S | ((state: T) => S);

export interface Store<T> {
  /** Read the current value. */
  getState: () => T;
  /** Read the value the store was created with. */
  getInitialState: () => T;
  /**
   * Update state. Default merge: shallow-merges `partial` over current.
   * Pass `replace=true` to replace wholesale.
   */
  setState: (partial: SetStateAction<T, Partial<T>>, replace?: boolean) => void;
  /**
   * Same as setState but does not notify subscribers. For pre-render
   * synchronization where notifying would cause a redundant re-render.
   */
  setStateSilent: (partial: SetStateAction<T, Partial<T>>, replace?: boolean) => void;
  /** Subscribe to every state change. Returns the unsubscribe fn. */
  subscribe: (listener: Listener<T>) => () => void;
  /** Remove all subscribers. The store still works after destroy. */
  destroy: () => void;
}

export function createStore<T extends object>(initialState: T = {} as T): Store<T> {
  const initial = initialState;
  let state = initialState;
  const subscribers = new Set<Listener<T>>();

  const setStateSilent = (partial: SetStateAction<T, Partial<T>>, replace = false) => {
    const next = typeof partial === "function" ? partial(state) : partial;
    state = replace ? (next as T) : { ...state, ...next };
  };

  return {
    getState: () => state,
    getInitialState: () => initial,
    setState(partial, replace) {
      const prev = state;
      setStateSilent(partial, replace);
      if (Object.is(prev, state)) return;
      subscribers.forEach((listener) => listener(state));
    },
    setStateSilent,
    subscribe(listener) {
      subscribers.add(listener);
      return () => {
        subscribers.delete(listener);
      };
    },
    destroy() {
      subscribers.clear();
    },
  };
}
