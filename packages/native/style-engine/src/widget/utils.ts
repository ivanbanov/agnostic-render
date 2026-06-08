/* eslint-disable @typescript-eslint/no-explicit-any */

const MEMO: unique symbol = Symbol('memo') as any

/**
 * Memoizes a function using nested WeakMaps keyed by argument identity.
 * Primitive args are interned into stable object tokens so everything goes
 * through one WeakMap chain. Used to cache `mergeStyles(...)` across renders.
 */
export function memo<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new WeakMap<object, any>()
  const intern = new Map<unknown, object>()

  return ((...args: Parameters<T>): ReturnType<T> => {
    let node: any = cache
    for (const arg of args) {
      let key = arg
      if (arg === null || (typeof arg !== 'object' && typeof arg !== 'function')) {
        key = intern.get(arg)
        if (!key) {
          key = {}
          intern.set(arg, key)
        }
      }
      let next = node.get(key)
      if (!next) {
        next = new WeakMap()
        node.set(key, next)
      }
      node = next
    }
    if (MEMO in node) return node[MEMO]
    const result = fn(...args)
    node[MEMO] = result
    return result
  }) as T
}

/** Plain-object check (rejects arrays, null, class instances). */
export function isObject(x: any): x is Record<string, any> {
  return Object.prototype.toString.call(x) === '[object Object]'
}

type AnyFn = (...args: any[]) => any
const composedCache = new WeakMap<AnyFn, WeakMap<AnyFn, AnyFn>>()

/**
 * Merge internal event handlers into `props`, composing overlapping `on*` keys
 * so BOTH fire (internal first, then the consumer's). Composed wrappers are
 * cached by (internal, external) pair to avoid per-render allocations on stable
 * handlers. Mutates `props` in place.
 */
export function composeHandlers(handlers: Record<string, any>, props: Record<string, any>): void {
  for (const key in handlers) {
    if (key in props && typeof props[key] === 'function') {
      const internal = handlers[key]
      const external = props[key]

      let innerMap = composedCache.get(internal)
      if (!innerMap) {
        innerMap = new WeakMap()
        composedCache.set(internal, innerMap)
      }
      let composed = innerMap.get(external)
      if (!composed) {
        composed = (...args: any[]) => {
          internal(...args)
          return external(...args)
        }
        innerMap.set(external, composed)
      }
      props[key] = composed
    } else {
      props[key] = handlers[key]
    }
  }
}
