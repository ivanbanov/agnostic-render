/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { createStore, shallowEqual } from '@render-experiment/store'
import { useStore } from '../src/use-store'

describe('useStore', () => {
  it('returns the current state', () => {
    const store = createStore({ count: 5 })
    const { result } = renderHook(() => useStore(store))
    expect(result.current).toEqual({ count: 5 })
  })

  it('updates when state changes', () => {
    const store = createStore({ count: 0 })
    const { result } = renderHook(() => useStore(store))

    expect(result.current).toEqual({ count: 0 })

    act(() => store.setState({ count: 1 }))

    expect(result.current).toEqual({ count: 1 })
  })

  describe('selector', () => {
    it('applies selector to state', () => {
      const store = createStore({ count: 5, name: 'test' })
      const { result } = renderHook(() => useStore(store, state => state.count))
      expect(result.current).toBe(5)
    })

    it('only re-renders when selected value changes', () => {
      const store = createStore({ count: 0, name: 'test' })
      let renderCount = 0

      const { result } = renderHook(() => {
        renderCount += 1
        return useStore(store, state => state.count)
      })

      expect(result.current).toBe(0)
      const initial = renderCount

      // Unrelated slice change — selector returns same primitive, no re-render.
      act(() => store.setState({ name: 'changed' }))
      expect(renderCount).toBe(initial)

      // Selected slice change — re-render.
      act(() => store.setState({ count: 1 }))
      expect(result.current).toBe(1)
      expect(renderCount).toBeGreaterThan(initial)
    })
  })

  describe('equality function', () => {
    it('uses Object.is by default — new-but-equal object triggers re-render', () => {
      const store = createStore({ data: { value: 1 } })
      let renderCount = 0

      const { result } = renderHook(() => {
        renderCount += 1
        return useStore(store, state => state.data)
      })

      const initial = renderCount
      const firstRef = result.current

      // New object, structurally equal — Object.is says not equal, re-render.
      act(() => store.setState({ data: { value: 1 } }))

      expect(renderCount).toBeGreaterThan(initial)
      expect(result.current).not.toBe(firstRef)
    })

    it('accepts custom equality function', () => {
      const store = createStore({ items: [1, 2, 3] })
      let renderCount = 0

      const { result } = renderHook(() => {
        renderCount += 1
        return useStore(
          store,
          state => state.items,
          (a, b) => a.length === b.length,
        )
      })

      expect(result.current).toEqual([1, 2, 3])
      const initial = renderCount

      // Same length — custom eq says equal, no re-render.
      act(() => store.setState({ items: [9, 8, 7] }))
      expect(renderCount).toBe(initial)

      // Different length — custom eq says not equal, re-render.
      act(() => store.setState({ items: [1, 2, 3, 4] }))
      expect(result.current).toEqual([1, 2, 3, 4])
    })

    it('works with shallowEqual for object comparison', () => {
      const store = createStore({ user: { name: 'John', age: 30 } })
      let renderCount = 0

      const { result } = renderHook(() => {
        renderCount += 1
        return useStore(store, state => state.user, shallowEqual)
      })

      expect(result.current).toEqual({ name: 'John', age: 30 })
      const initial = renderCount

      // New object, shallow-equal contents — no re-render.
      act(() => store.setState({ user: { name: 'John', age: 30 } }))
      expect(renderCount).toBe(initial)

      // Real change — re-render.
      act(() => store.setState({ user: { name: 'Jane', age: 30 } }))
      expect(result.current).toEqual({ name: 'Jane', age: 30 })
    })
  })
})
