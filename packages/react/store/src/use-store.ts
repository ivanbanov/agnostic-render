/**
 * useStore — React hook over a vanilla store.
 *
 *   const value = useStore(store);                              // whole state
 *   const count = useStore(store, (s) => s.count);              // selector
 *   const item  = useStore(store, (s) => s.item, shallowEqual); // + equality
 *
 * Equality lives on the consumer side: the store always notifies, the
 * hook short-circuits the re-render when the selected slice didn't
 * change by the caller's definition. Defaults to `Object.is`.
 *
 * Built on `use-sync-external-store/shim/with-selector` for React-19
 * compatibility and concurrent-mode safety.
 */

// @ts-expect-error — the shim has its own types we don't need to inspect.
import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector.js'
import type { Store } from '@render-experiment/store'

const identity = <T>(state: T): T => state

export function useStore<T, S = T>(
  store: Store<T>,
  selector: (state: T) => S = identity as unknown as (state: T) => S,
  equalityFn: (a: S, b: S) => boolean = Object.is,
): S {
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    selector,
    equalityFn,
  )
}
