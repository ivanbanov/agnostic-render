/**
 * Core spec tests for the Tooltip — framework-free.
 *
 * Drives `tooltipMachine` directly via `createMachine` and exercises
 * `connectTooltip` on raw snapshots. No React, no DOM rendering. This is
 * the source-of-truth layer: it asserts the SPEC.md behavior once, at the
 * agnostic level, independent of any substrate.
 *
 * Mapping to packages/core/components/tooltip/SPEC.md:
 *   - States: closed → opening → open → closing
 *   - Opening: hover-after-delay, focus-immediate, skip-delay window, controlled
 *   - Closing: pointer-leave grace, hoverable content, blur, escape (via event)
 *   - Mutual exclusion: only one open at a time
 *   - Disabled: no source opens; open ones dismiss
 *   - Accessibility (connect): role=tooltip, describedBy, data-state, data-side
 *
 * Notes:
 *   - Delay effects use setTimeout, so we use vitest fake timers.
 *   - `trackEscapeKey` is a substrate effect (no-op in core); the adapter
 *     turns a real Escape keypress into a `close` event. At the core level
 *     we assert the machine's response to that `close`, plus the connect's
 *     closeOnEscape/onEscapeKeyDown handling is an adapter concern tested in
 *     the React suite. Here we cover the state-machine contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  connectTooltip,
  TOOLTIP_DEFAULTS,
  tooltipMachine,
  tooltipStore,
  type TooltipApi,
  type TooltipContext,
  type TooltipMachineProps,
  type TooltipProps,
  type TooltipState,
} from '@render-experiment/tooltip-core'
import { createMachine } from '@render-experiment/machine-core'

// -----------------------------------------------------------------------------
// Harness
// -----------------------------------------------------------------------------

let nextId = 0

/** Build a started machine for a fresh tooltip instance. Resolves defaults
 * the same way the adapter entry does, so the machine gets concrete config. */
function makeMachine(props: Partial<TooltipProps> = {}) {
  const raw: TooltipProps = { id: `t${nextId++}`, ...props }
  const config: TooltipMachineProps = { ...TOOLTIP_DEFAULTS, ...raw }
  const machine = createMachine(tooltipMachine, config)
  machine.start()
  return machine
}

/**
 * Snapshot the machine and run connect over it — what a view would see.
 * `connector` is curried: connect(snapshot)(...extras). Tooltip takes no
 * extras, so the inner call is argument-less.
 */
function api(machine: ReturnType<typeof makeMachine>): TooltipApi {
  return connectTooltip({
    state: machine.getState() as TooltipState,
    context: machine.getContext() as TooltipContext,
    props: machine.getProps(),
    send: machine.send,
    computed: machine.getComputed(),
  })()
}

beforeEach(() => {
  vi.useFakeTimers()
  tooltipStore.setOpen(null)
  tooltipStore.endSkipWindow()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

// -----------------------------------------------------------------------------
// Initial state — controlled / uncontrolled
// -----------------------------------------------------------------------------

describe('initial state', () => {
  it('starts closed by default', () => {
    const m = makeMachine()
    expect(m.getState()).toBe('closed')
  })

  it('starts open when defaultOpen is true', () => {
    const m = makeMachine({ defaultOpen: true })
    expect(m.getState()).toBe('open')
  })

  it('starts open when controlled open is true', () => {
    const m = makeMachine({ open: true })
    expect(m.getState()).toBe('open')
  })
})

// -----------------------------------------------------------------------------
// Opening
// -----------------------------------------------------------------------------

describe('opening', () => {
  it('hover enters `opening`, then `open` after the open delay', () => {
    const m = makeMachine({ openDelay: 400 })
    m.send({ type: 'pointer.move' })
    expect(m.getState()).toBe('opening')

    vi.advanceTimersByTime(399)
    expect(m.getState()).toBe('opening')

    vi.advanceTimersByTime(1)
    expect(m.getState()).toBe('open')
  })

  it('honors a custom open delay', () => {
    const m = makeMachine({ openDelay: 1000 })
    m.send({ type: 'pointer.move' })
    vi.advanceTimersByTime(999)
    expect(m.getState()).toBe('opening')
    vi.advanceTimersByTime(1)
    expect(m.getState()).toBe('open')
  })

  it('pointer leaving during `opening` aborts the open', () => {
    const m = makeMachine({ openDelay: 500 })
    m.send({ type: 'pointer.move' })
    vi.advanceTimersByTime(200)
    m.send({ type: 'pointer.leave' })
    expect(m.getState()).toBe('closed')
    vi.advanceTimersByTime(500)
    expect(m.getState()).toBe('closed')
  })

  it('focus opens immediately with no delay (via `open` event)', () => {
    const m = makeMachine()
    // The connect's onFocus sends `open` (src: trigger.focus).
    api(m).parts.trigger.handlers.onFocus?.()
    expect(m.getState()).toBe('open')
  })
})

// -----------------------------------------------------------------------------
// Skip-delay window
// -----------------------------------------------------------------------------

describe('skip-delay window', () => {
  it('opens instantly while the skip window is active', () => {
    // First tooltip opens (focus) and starts the skip window via setGlobalId.
    const first = makeMachine({ skipDelayDuration: 300 })
    first.send({ type: 'open' })
    expect(first.getState()).toBe('open')
    expect(tooltipStore.isInSkipWindow()).toBe(true)

    // A second tooltip hovered within the window skips the delay.
    const second = makeMachine({ skipDelayDuration: 300 })
    second.send({ type: 'pointer.move' })
    expect(second.getState()).toBe('open')
    expect(second.getContext().hasInstantOpen).toBe(true)
  })

  it('skipDelayDuration=0 never starts a skip window', () => {
    const first = makeMachine({ skipDelayDuration: 0 })
    first.send({ type: 'open' })
    expect(tooltipStore.isInSkipWindow()).toBe(false)

    const second = makeMachine({ skipDelayDuration: 0 })
    second.send({ type: 'pointer.move' })
    // No skip window → goes through `opening`, not instant.
    expect(second.getState()).toBe('opening')
  })
})

// -----------------------------------------------------------------------------
// Closing
// -----------------------------------------------------------------------------

describe('closing', () => {
  it('pointer leave from open enters `closing`, then `closed` after close delay (hoverable)', () => {
    const m = makeMachine({ closeDelay: 150 })
    m.send({ type: 'open' })
    m.send({ type: 'pointer.leave' })
    // Hoverable content is the default → grace period.
    expect(m.getState()).toBe('closing')

    vi.advanceTimersByTime(149)
    expect(m.getState()).toBe('closing')
    vi.advanceTimersByTime(1)
    expect(m.getState()).toBe('closed')
  })

  it('re-entering during the grace period returns to open', () => {
    const m = makeMachine({ closeDelay: 150 })
    m.send({ type: 'open' })
    m.send({ type: 'pointer.leave' })
    expect(m.getState()).toBe('closing')

    m.send({ type: 'pointer.move' })
    expect(m.getState()).toBe('open')
  })

  it('disableHoverableContent closes immediately on pointer leave (no grace)', () => {
    const m = makeMachine({ disableHoverableContent: true })
    m.send({ type: 'open' })
    m.send({ type: 'pointer.leave' })
    expect(m.getState()).toBe('closed')
  })

  it('a `close` event (what the Escape adapter sends) closes from open', () => {
    const m = makeMachine()
    m.send({ type: 'open' })
    expect(m.getState()).toBe('open')
    m.send({ type: 'close', src: 'keydown.escape' })
    expect(m.getState()).toBe('closed')
  })
})

// -----------------------------------------------------------------------------
// onOpenChange callback
// -----------------------------------------------------------------------------

describe('onOpenChange', () => {
  it('fires {open:true} on open and {open:false} on close', () => {
    const onOpenChange = vi.fn()
    const m = makeMachine({ onOpenChange })
    m.send({ type: 'open' })
    expect(onOpenChange).toHaveBeenCalledWith({ open: true })

    m.send({ type: 'close' })
    expect(onOpenChange).toHaveBeenLastCalledWith({ open: false })
  })
})

// -----------------------------------------------------------------------------
// Mutual exclusion
// -----------------------------------------------------------------------------

describe('mutual exclusion', () => {
  it('opening a second tooltip closes the first', () => {
    const first = makeMachine()
    first.send({ type: 'open' })
    expect(first.getState()).toBe('open')

    const second = makeMachine()
    second.send({ type: 'open' })

    // first's trackGlobalStore subscription fires `close` when the store id changes.
    expect(second.getState()).toBe('open')
    expect(first.getState()).toBe('closed')
  })
})

// -----------------------------------------------------------------------------
// Disabled
// -----------------------------------------------------------------------------

describe('disabled', () => {
  it('the connect handlers no-op when disabled (no source opens it)', () => {
    const m = makeMachine({ disabled: true })
    const t = api(m).parts.trigger.handlers
    t.onPointerMove?.({ pointerType: 'mouse' } as never)
    t.onFocus?.()
    expect(m.getState()).toBe('closed')
  })

  it('connect exposes aria/data-disabled on the trigger when disabled', () => {
    const m = makeMachine({ disabled: true })
    const attrs = api(m).parts.trigger.attrs
    expect(attrs.disabled).toBe(true)
    expect(attrs['data-disabled']).toBe('')
  })
})

// -----------------------------------------------------------------------------
// connect — accessibility surface
// -----------------------------------------------------------------------------

describe('connect accessibility surface', () => {
  it('content carries role=tooltip and the resolved side', () => {
    const m = makeMachine({ open: true, placement: 'right' })
    const content = api(m).parts.content
    expect(content.attrs.role).toBe('tooltip')
    expect(content.attrs['data-side']).toBe('right')
    expect(content.variants.side).toBe('right')
  })

  it('trigger describedBy points at the content id only while open', () => {
    const closed = makeMachine()
    expect(api(closed).parts.trigger.attrs.describedBy).toBeUndefined()

    const open = makeMachine({ open: true })
    const a = api(open)
    expect(a.parts.trigger.attrs.describedBy).toBe(a.parts.content.attrs.id)
  })

  it('data-state reflects closed / delayed-open / instant-open', () => {
    const closed = makeMachine()
    expect(api(closed).parts.content.attrs['data-state']).toBe('closed')

    // delayed open (hover path)
    const delayed = makeMachine({ openDelay: 10 })
    delayed.send({ type: 'pointer.move' })
    vi.advanceTimersByTime(10)
    expect(api(delayed).parts.content.attrs['data-state']).toBe('delayed-open')

    // instant open (skip window)
    const first = makeMachine()
    first.send({ type: 'open' })
    const second = makeMachine()
    second.send({ type: 'pointer.move' })
    expect(api(second).parts.content.attrs['data-state']).toBe('instant-open')
  })

  it('content is only `rendered` while visually open (open or closing)', () => {
    const m = makeMachine()
    expect(api(m).parts.content.rendered).toBe(false)
    m.send({ type: 'open' })
    expect(api(m).parts.content.rendered).toBe(true)
    m.send({ type: 'pointer.leave' }) // → closing (hoverable default)
    expect(api(m).parts.content.rendered).toBe(true)
  })
})
