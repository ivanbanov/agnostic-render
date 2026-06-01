/**
 * createStoreProvider — pairs a React Context with a Store instance and
 * exposes a `useSelector` hook scoped to that Context.
 *
 *   const { Provider, useSelector } = createStoreProvider<MyState>();
 *
 *   <Provider initialState={{ count: 0 }}>
 *     <Counter />
 *   </Provider>
 *
 *   const [count, setState] = useSelector((s) => s.count);
 *
 * Options:
 *   - inherit: nested Providers seed from the parent's current state.
 *   - throwOnMissingProvider (default true): useSelector throws if used
 *     outside a Provider. Set false to get a fallback (undefined slice,
 *     no-op setState) without crashing.
 *   - defaultEqualityFn: applied per-selector unless the call overrides.
 */

import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { createStore, type Store } from '@render-experiment/store'
import { useStore } from './use-store'

export interface StoreProviderProps<T> {
  children: ReactNode
  initialState?: Partial<T>
}

export interface StoreProvider<T extends object> {
  Context: React.Context<Store<T> | null>
  Provider: (props: StoreProviderProps<T>) => React.JSX.Element
  useSelector: <S>(
    selector: (state: T) => S,
    equalityFn?: (a: S, b: S) => boolean,
  ) => [S, (next: Partial<T>) => void]
}

export interface StoreProviderOptions<T extends object> {
  /** When true, nested Providers merge over the parent's state on mount. */
  inherit?: boolean
  /**
   * When true (default), useSelector throws if no Provider is mounted
   * above. Set false to silently fall back to an empty store.
   */
  throwOnMissingProvider?: boolean
  /** Default equality function used by useSelector calls. */
  defaultEqualityFn?: (a: unknown, b: unknown) => boolean
}

export function createStoreProvider<T extends object>(
  options: StoreProviderOptions<T> = {},
): StoreProvider<T> {
  const { inherit = false, throwOnMissingProvider = true, defaultEqualityFn } = options

  const Context = createContext<Store<T> | null>(null)

  // Stable fallback shared across all hook calls — only consulted when
  // the consumer opted into `throwOnMissingProvider: false`.
  const fallbackStore = createStore<T>({} as T)

  const Provider = ({ children, initialState }: StoreProviderProps<T>) => {
    const parentStore = useContext(Context)
    const storeRef = useRef<Store<T> | null>(null)

    if (!storeRef.current) {
      storeRef.current = createStore<T>({
        ...(inherit ? parentStore?.getState() : undefined),
        ...initialState,
      } as T)
    }

    // Re-sync on initialState prop changes (e.g., parent state derived
    // from props). Skip on first render since we already seeded above.
    const firstRun = useRef(true)
    useEffect(() => {
      if (firstRun.current) {
        firstRun.current = false
        return
      }
      if (initialState && storeRef.current) {
        storeRef.current.setState(initialState)
      }
    }, [initialState])

    useEffect(() => () => storeRef.current?.destroy(), [])

    return <Context.Provider value={storeRef.current}>{children}</Context.Provider>
  }

  const useSelector: StoreProvider<T>['useSelector'] = (selector, equalityFn) => {
    const store = useContext(Context)
    // Always call useStore unconditionally to satisfy rules-of-hooks.
    const selected = useStore(
      store ?? fallbackStore,
      selector,
      equalityFn ?? (defaultEqualityFn as ((a: unknown, b: unknown) => boolean) | undefined),
    )

    if (!store && throwOnMissingProvider) {
      throw new Error('useSelector must be used within a Provider')
    }

    return [selected, store?.setState ?? (() => {})]
  }

  return { Context, Provider, useSelector }
}
