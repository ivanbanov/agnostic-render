/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { shallowEqual } from '@render-experiment/store'
import { createStoreProvider } from '../src/provider'

interface TestState {
  count: number
  name: string
}

describe('createStoreProvider', () => {
  describe('Provider', () => {
    it('provides state to children via useSelector', () => {
      const { Provider, useSelector } = createStoreProvider<TestState>()

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider initialState={{ count: 5, name: 'test' }}>{children}</Provider>
      )

      const { result } = renderHook(() => useSelector(s => s.count), {
        wrapper,
      })

      expect(result.current[0]).toBe(5)
    })

    it('returns a setState function from useSelector', () => {
      const { Provider, useSelector } = createStoreProvider<TestState>()

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider initialState={{ count: 0, name: 'test' }}>{children}</Provider>
      )

      const { result } = renderHook(() => useSelector(s => s.count), {
        wrapper,
      })

      expect(result.current[0]).toBe(0)
      expect(typeof result.current[1]).toBe('function')

      act(() => result.current[1]({ count: 7 }))
      expect(result.current[0]).toBe(7)
    })

    it('updates state when initialState prop changes', () => {
      const { Provider, useSelector } = createStoreProvider<TestState>()

      let initialState: Partial<TestState> = { count: 1, name: 'initial' }
      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider initialState={initialState}>{children}</Provider>
      )

      const { result, rerender } = renderHook(() => useSelector(s => s.count), { wrapper })

      expect(result.current[0]).toBe(1)

      initialState = { count: 99, name: 'updated' }
      rerender()

      expect(result.current[0]).toBe(99)
    })
  })

  describe('inheritance (inherit: true)', () => {
    it('inherits state from parent provider', () => {
      const { Provider, useSelector } = createStoreProvider<TestState>({
        inherit: true,
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider initialState={{ count: 10, name: 'parent' }}>
          <Provider initialState={{ name: 'child' }}>{children}</Provider>
        </Provider>
      )

      const { result } = renderHook(() => useSelector(s => s), { wrapper })

      expect(result.current[0]).toEqual({ count: 10, name: 'child' })
    })

    it('child can override parent values', () => {
      const { Provider, useSelector } = createStoreProvider<TestState>({
        inherit: true,
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider initialState={{ count: 5, name: 'parent' }}>
          <Provider initialState={{ count: 100, name: 'child' }}>{children}</Provider>
        </Provider>
      )

      const { result } = renderHook(() => useSelector(s => s.count), {
        wrapper,
      })

      expect(result.current[0]).toBe(100)
    })
  })

  describe('throwOnMissingProvider option', () => {
    it('throws when used outside Provider (default)', () => {
      const { useSelector } = createStoreProvider<TestState>()

      // React logs the boundary error; silence it for the test.
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => renderHook(() => useSelector(s => s.count))).toThrowError(
        /useSelector must be used within a Provider/,
      )

      errSpy.mockRestore()
    })

    it('returns fallback value when throwOnMissingProvider is false', () => {
      const { useSelector } = createStoreProvider<TestState>({
        throwOnMissingProvider: false,
      })

      const { result } = renderHook(() => useSelector(s => s.count))

      expect(result.current[0]).toBeUndefined()
    })

    it('returns noop setState when throwOnMissingProvider is false', () => {
      const { useSelector } = createStoreProvider<TestState>({
        throwOnMissingProvider: false,
      })

      const { result } = renderHook(() => useSelector(s => s))

      expect(() => result.current[1]({ count: 5 })).not.toThrow()
    })
  })

  describe('defaultEqualityFn option', () => {
    it('uses provided default equality function', () => {
      const customEqualityFn = vi.fn((a: unknown, b: unknown) => Object.is(a, b))
      const { Provider, useSelector } = createStoreProvider<TestState>({
        defaultEqualityFn: customEqualityFn,
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider initialState={{ count: 0, name: 'test' }}>{children}</Provider>
      )

      const { result } = renderHook(() => useSelector(s => s.count), {
        wrapper,
      })

      act(() => result.current[1]({ count: 0 }))

      expect(customEqualityFn).toHaveBeenCalled()
    })

    it('allows overriding default equality function per call', () => {
      const defaultEq = vi.fn((a: unknown, b: unknown) => Object.is(a, b))
      const customEq = vi.fn(<S,>(a: S, b: S) => shallowEqual(a, b))

      const { Provider, useSelector } = createStoreProvider<TestState>({
        defaultEqualityFn: defaultEq,
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider initialState={{ count: 0, name: 'test' }}>{children}</Provider>
      )

      const { result } = renderHook(() => useSelector(s => ({ count: s.count }), customEq), {
        wrapper,
      })

      act(() => result.current[1]({ count: 0 }))

      expect(customEq).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('destroys store on unmount', () => {
      const { Provider, useSelector } = createStoreProvider<TestState>()

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider initialState={{ count: 0, name: 'test' }}>{children}</Provider>
      )

      const { unmount } = renderHook(() => useSelector(s => s.count), {
        wrapper,
      })

      expect(() => unmount()).not.toThrow()
    })
  })
})
