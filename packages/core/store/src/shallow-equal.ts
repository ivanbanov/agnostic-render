/**
 * Shallow equality comparison.
 *
 * Returns true when both inputs are the same primitive (via Object.is) or
 * both are objects with the same own keys and shallow-equal values
 * (also via Object.is).
 *
 *   shallowEqual({ a: 1 }, { a: 1 })           // true
 *   shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })  // false (nested compare)
 *   shallowEqual(NaN, NaN)                     // true   (Object.is)
 *   shallowEqual(0, -0)                        // false  (Object.is)
 *
 * Useful as a selector equality function passed to useStore:
 *
 *   const items = useStore(store, s => s.items, shallowEqual);
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }

  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false

  const objA = a as Record<string, unknown>
  const objB = b as Record<string, unknown>
  return keysA.every(key => Object.hasOwn(b, key) && Object.is(objA[key], objB[key]))
}
