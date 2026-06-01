/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Tooltip } from '@render-experiment/tooltip-react'
import { tooltipStore } from '@render-experiment/tooltip-core'

/**
 * Positioning + viewport-visibility behaviors from SPEC.md.
 *
 * jsdom does not implement ResizeObserver or IntersectionObserver, so
 * we install minimal manual-fire stubs the tests drive directly.
 *
 * jsdom also does not lay out elements — getBoundingClientRect returns
 * zero by default. We patch getBoundingClientRect on the elements we
 * care about so collision/visibility decisions get real numbers.
 */

// -----------------------------------------------------------------------------
// observer stubs — manually fire from tests
// -----------------------------------------------------------------------------

interface FakeResizeRecord {
  target: Element
}
type ResizeCb = (entries: FakeResizeRecord[]) => void

interface FakeIntersectRecord {
  target: Element
  isIntersecting: boolean
  intersectionRatio: number
}
type IntersectCb = (entries: FakeIntersectRecord[]) => void

const resizeObservers: { cb: ResizeCb; targets: Element[] }[] = []
const intersectObservers: { cb: IntersectCb; targets: Element[] }[] = []

class FakeResizeObserver {
  private cb: ResizeCb
  private targets: Element[] = []
  constructor(cb: ResizeCb) {
    this.cb = cb
    resizeObservers.push({ cb, targets: this.targets })
  }
  observe(t: Element): void {
    this.targets.push(t)
  }
  unobserve(): void {}
  disconnect(): void {}
}

class FakeIntersectionObserver {
  private cb: IntersectCb
  private targets: Element[] = []
  constructor(cb: IntersectCb) {
    this.cb = cb
    intersectObservers.push({ cb, targets: this.targets })
  }
  observe(t: Element): void {
    this.targets.push(t)
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): FakeIntersectRecord[] {
    return []
  }
}

const fireResize = (target: Element) => {
  for (const o of resizeObservers) {
    if (o.targets.includes(target)) {
      act(() => o.cb([{ target }]))
    }
  }
}

const fireIntersection = (target: Element, isIntersecting: boolean) => {
  for (const o of intersectObservers) {
    if (o.targets.includes(target)) {
      act(() =>
        o.cb([
          {
            target,
            isIntersecting,
            intersectionRatio: isIntersecting ? 1 : 0,
          },
        ]),
      )
    }
  }
}

// -----------------------------------------------------------------------------
// rect patching — make jsdom layout-aware on demand
// -----------------------------------------------------------------------------

function stubRect(el: Element, rect: { top: number; left: number; width: number; height: number }) {
  el.getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => '',
    }) as DOMRect
}

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    configurable: true,
    value: height,
  })
}

// -----------------------------------------------------------------------------
// shared setup
// -----------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers()
  tooltipStore.setOpen(null)
  tooltipStore.endSkipWindow()
  resizeObservers.length = 0
  intersectObservers.length = 0
  // @ts-expect-error -- install stub
  globalThis.ResizeObserver = FakeResizeObserver
  // @ts-expect-error -- install stub
  globalThis.IntersectionObserver = FakeIntersectionObserver
  setViewport(1000, 800)
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  cleanup()
})

// -----------------------------------------------------------------------------
// SPEC: "When the preferred side would clip, the renderer flips to the
//        opposite side."
// -----------------------------------------------------------------------------

describe('collision — side flips when clipped', () => {
  it("flips bottom → top when there's no room below the trigger", () => {
    render(
      <Tooltip defaultOpen placement='bottom'>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    )

    // Trigger near the very bottom of the viewport — bottom placement
    // would push the tooltip off-screen.
    const trigger = screen.getByText('Trigger')
    stubRect(trigger, { top: 780, left: 100, width: 80, height: 16 })

    // Content too tall to fit below.
    const content = screen.getByRole('tooltip')
    stubRect(content, { top: 0, left: 0, width: 140, height: 60 })

    // Force a measure recompute.
    fireEvent.scroll(window)

    expect(content.getAttribute('data-side')).toBe('top')
  })

  it("flips right → left when there's no room to the right", () => {
    render(
      <Tooltip defaultOpen placement='right'>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    )

    const trigger = screen.getByText('Trigger')
    stubRect(trigger, { top: 100, left: 920, width: 60, height: 30 })

    const content = screen.getByRole('tooltip')
    stubRect(content, { top: 0, left: 0, width: 200, height: 40 })

    fireEvent.scroll(window)

    expect(content.getAttribute('data-side')).toBe('left')
  })

  it('keeps the preferred side when it fits', () => {
    render(
      <Tooltip defaultOpen placement='bottom'>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    )

    const trigger = screen.getByText('Trigger')
    stubRect(trigger, { top: 100, left: 100, width: 80, height: 16 })

    const content = screen.getByRole('tooltip')
    stubRect(content, { top: 0, left: 0, width: 140, height: 40 })

    fireEvent.scroll(window)

    expect(content.getAttribute('data-side')).toBe('bottom')
  })
})

// -----------------------------------------------------------------------------
// SPEC: "Position is recomputed when the trigger moves, the window
//        resizes, or the surrounding content scrolls."
// -----------------------------------------------------------------------------

describe('trigger move — recompute on resize', () => {
  it("recomputes side when the trigger's ResizeObserver fires", () => {
    render(
      <Tooltip defaultOpen placement='bottom'>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    )

    const trigger = screen.getByText('Trigger')
    stubRect(trigger, { top: 100, left: 100, width: 80, height: 16 })
    const content = screen.getByRole('tooltip')
    stubRect(content, { top: 0, left: 0, width: 140, height: 40 })

    fireEvent.scroll(window)
    expect(content.getAttribute('data-side')).toBe('bottom')

    // Trigger moves to the bottom of the viewport (no scroll, no resize —
    // just the trigger box itself changed).
    stubRect(trigger, { top: 780, left: 100, width: 80, height: 16 })
    fireResize(trigger)

    expect(content.getAttribute('data-side')).toBe('top')
  })
})

// -----------------------------------------------------------------------------
// SPEC: "If the trigger leaves the viewport, the tooltip dismisses."
// -----------------------------------------------------------------------------

describe('viewport visibility — dismiss when trigger leaves', () => {
  it("closes when the trigger's IntersectionObserver reports out-of-view", () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    )

    const trigger = screen.getByText('Trigger')
    expect(screen.getByRole('tooltip')).toBeTruthy()

    fireIntersection(trigger, false)

    expect(screen.queryByRole('tooltip')).toBeNull()
  })

  it('stays open while the trigger remains in view', () => {
    render(
      <Tooltip defaultOpen>
        <Tooltip.Trigger>
          <button>Trigger</button>
        </Tooltip.Trigger>
        <Tooltip.Content>Content</Tooltip.Content>
      </Tooltip>,
    )

    const trigger = screen.getByText('Trigger')
    fireIntersection(trigger, true)

    expect(screen.getByRole('tooltip')).toBeTruthy()
  })
})
