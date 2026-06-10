/**
 * Core spec tests for the Tooltip — framework-free.
 *
 * Builds the machine from `tooltipMachineConfig` and drives it directly;
 * exercises `connectTooltip` through a `connector` (so the snapshot + the
 * onOpenChange reaction are real). No React, no DOM. This is the
 * source-of-truth layer asserting SPEC.md behavior at the agnostic level.
 *
 * Notes:
 *   - `after` delays use setTimeout → vitest fake timers.
 *   - Escape's listener + prevent-able onEscapeKeyDown gate are a substrate
 *     (React) concern; here we assert the machine closes on the `escape`/`close`
 *     event the target's effects.ts sends after gating.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  connectTooltip,
  TOOLTIP_DEFAULTS,
  tooltipMachineConfig,
  tooltipStore,
  type TooltipApi,
  type TooltipMachineProps,
  type TooltipProps,
} from '@render-experiment/tooltip-core'
import { connector, machine } from '@render-experiment/machine-core'

// -----------------------------------------------------------------------------
// Harness
// -----------------------------------------------------------------------------

let nextId = 0

/** Build + start a tooltip machine and its connector (defaults resolved as the
 * target entry does). The connector makes connect's snapshot + reactions real. */
function make(props: Partial<TooltipProps> = {}) {
  const resolved: TooltipMachineProps = { ...TOOLTIP_DEFAULTS, id: `t${nextId++}`, ...props }
  const m = machine(tooltipMachineConfig(resolved))
  const conn = connector(m, connectTooltip, resolved)
  m.start() // wires the connector's reactions automatically (onStart)
  return { m, conn }
}

/** What a view would see — the connector's current api snapshot. */
function api(conn: ReturnType<typeof make>['conn']): TooltipApi {
  return conn.snapshot
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
    const { m } = make()
    expect(m.state).toBe('closed')
  })

  it('starts open when defaultOpen is true', () => {
    const { m } = make({ defaultOpen: true })
    expect(m.state).toBe('open')
  })

  it('starts open when controlled open is true', () => {
    const { m } = make({ open: true })
    expect(m.state).toBe('open')
  })
})

// -----------------------------------------------------------------------------
// Opening
// -----------------------------------------------------------------------------

describe('opening', () => {
  it('hover enters `opening`, then `open` after the open delay', () => {
    const { m } = make({ openDelay: 400 })
    m.send({ type: 'pointer.move' })
    expect(m.state).toBe('opening')
    vi.advanceTimersByTime(399)
    expect(m.state).toBe('opening')
    vi.advanceTimersByTime(1)
    expect(m.state).toBe('open')
  })

  it('honors a custom open delay', () => {
    const { m } = make({ openDelay: 1000 })
    m.send({ type: 'pointer.move' })
    vi.advanceTimersByTime(999)
    expect(m.state).toBe('opening')
    vi.advanceTimersByTime(1)
    expect(m.state).toBe('open')
  })

  it('pointer leaving during `opening` aborts the open', () => {
    const { m } = make({ openDelay: 500 })
    m.send({ type: 'pointer.move' })
    vi.advanceTimersByTime(200)
    m.send({ type: 'pointer.leave' })
    expect(m.state).toBe('closed')
    vi.advanceTimersByTime(500)
    expect(m.state).toBe('closed')
  })

  it('focus opens immediately with no delay (via `open` event)', () => {
    const { m, conn } = make()
    api(conn).parts.trigger.onFocus?.()
    expect(m.state).toBe('open')
  })
})

// -----------------------------------------------------------------------------
// Skip-delay window
// -----------------------------------------------------------------------------

describe('skip-delay window', () => {
  it('opens instantly while the skip window is active', () => {
    const first = make({ skipDelayDuration: 300 })
    first.m.send({ type: 'open' })
    expect(first.m.state).toBe('open')
    expect(tooltipStore.isInSkipWindow()).toBe(true)

    // A pointer move inside the skip window opens immediately — no `opening`.
    const second = make({ skipDelayDuration: 300 })
    second.m.send({ type: 'pointer.move' })
    expect(second.m.state).toBe('open')
  })

  it('skipDelayDuration=0 never starts a skip window', () => {
    const first = make({ skipDelayDuration: 0 })
    first.m.send({ type: 'open' })
    expect(tooltipStore.isInSkipWindow()).toBe(false)

    const second = make({ skipDelayDuration: 0 })
    second.m.send({ type: 'pointer.move' })
    expect(second.m.state).toBe('opening')
  })
})

// -----------------------------------------------------------------------------
// Closing
// -----------------------------------------------------------------------------

describe('closing', () => {
  it('pointer leave from open enters `closing`, then `closed` after close delay (hoverable)', () => {
    const { m } = make({ closeDelay: 150 })
    m.send({ type: 'open' })
    m.send({ type: 'pointer.leave' })
    expect(m.state).toBe('closing')
    vi.advanceTimersByTime(149)
    expect(m.state).toBe('closing')
    vi.advanceTimersByTime(1)
    expect(m.state).toBe('closed')
  })

  it('re-entering during the grace period returns to open', () => {
    const { m } = make({ closeDelay: 150 })
    m.send({ type: 'open' })
    m.send({ type: 'pointer.leave' })
    expect(m.state).toBe('closing')
    m.send({ type: 'pointer.move' })
    expect(m.state).toBe('open')
  })

  it('disableHoverableContent closes immediately on pointer leave (no grace)', () => {
    const { m } = make({ disableHoverableContent: true })
    m.send({ type: 'open' })
    m.send({ type: 'pointer.leave' })
    expect(m.state).toBe('closed')
  })

  it('an `escape` event (sent by the target effects.ts after gating) closes from open', () => {
    const { m } = make()
    m.send({ type: 'open' })
    expect(m.state).toBe('open')
    m.send({ type: 'escape', src: 'keydown.escape' })
    expect(m.state).toBe('closed')
  })
})

// -----------------------------------------------------------------------------
// onOpenChange callback (fired by the connector reaction)
// -----------------------------------------------------------------------------

describe('onOpenChange', () => {
  it('fires {open:true} on open and {open:false} on close', () => {
    const onOpenChange = vi.fn()
    const { m } = make({ onOpenChange })
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
    const first = make()
    first.m.send({ type: 'open' })
    expect(first.m.state).toBe('open')

    const second = make()
    second.m.send({ type: 'open' })

    expect(second.m.state).toBe('open')
    expect(first.m.state).toBe('closed') // first's trackGlobalStore closed it
  })
})

// -----------------------------------------------------------------------------
// Disabled
// -----------------------------------------------------------------------------

describe('disabled', () => {
  it('the connect handlers no-op when disabled (no source opens it)', () => {
    const { m, conn } = make({ disabled: true })
    const t = api(conn).parts.trigger
    t.onPointerMove?.({ pointerType: 'mouse' })
    t.onFocus?.()
    expect(m.state).toBe('closed')
  })

  it('connect exposes the disabled attr on the trigger when disabled', () => {
    const { conn } = make({ disabled: true })
    expect(api(conn).parts.trigger.disabled).toBe(true)
  })
})

// -----------------------------------------------------------------------------
// connect — accessibility surface
// -----------------------------------------------------------------------------

describe('connect accessibility surface', () => {
  it('content carries role=tooltip and the resolved side', () => {
    const { conn } = make({ open: true, placement: 'right' })
    const content = api(conn).parts.content
    expect(content.role).toBe('tooltip')
    expect(content.side).toBe('right')
  })

  it('trigger describedBy points at the content id only while open', () => {
    const closed = make()
    expect(api(closed.conn).parts.trigger.describedBy).toBeUndefined()

    const open = make({ open: true })
    const a = api(open.conn)
    expect(a.parts.trigger.describedBy).toBe(a.parts.content.id)
  })
  it('reports open while visually open (open or closing) — the mount gate', () => {
    const { m, conn } = make()
    expect(api(conn).open).toBe(false)
    m.send({ type: 'open' })
    expect(api(conn).open).toBe(true)
    m.send({ type: 'pointer.leave' }) // → closing (hoverable default)
    expect(api(conn).open).toBe(true)
  })
})
