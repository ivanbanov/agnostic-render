import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ACCORDION_DEFAULTS,
  accordionMachineConfig,
  connectAccordion,
  type AccordionApi,
  type AccordionItemProps,
  type AccordionMachineProps,
  type AccordionProps,
} from '@render-experiment/accordion-core'
import { connector, machine } from '@render-experiment/machine-core'

// -----------------------------------------------------------------------------
// Harness
// -----------------------------------------------------------------------------

let nextId = 0

const ITEMS: AccordionItemProps[] = [{ value: 'a' }, { value: 'b' }, { value: 'c' }]

interface Harness {
  api: () => AccordionApi
  destroy: () => void
}

/** Build + start an accordion machine and its connector (defaults resolved as
 * the adapter entry does). `api()` returns the item-aware api each call. */
function make(props: Partial<AccordionProps> = {}, items = ITEMS): Harness {
  const resolved: AccordionMachineProps = {
    ...ACCORDION_DEFAULTS,
    id: `acc${nextId++}`,
    ...props,
  }
  const m = machine(accordionMachineConfig(resolved))
  const conn = connector(m, connectAccordion, resolved)
  m.start()
  return {
    api: () => conn.snapshot.withItems(items),
    destroy: () => conn.destroy(),
  }
}

const harnesses: Harness[] = []
function track(h: Harness): Harness {
  harnesses.push(h)
  return h
}

afterEach(() => {
  while (harnesses.length) harnesses.pop()!.destroy()
})

// -----------------------------------------------------------------------------
// Expansion mode
// -----------------------------------------------------------------------------

describe('expansion mode', () => {
  it('single: opening one closes the previously open one', () => {
    const h = track(make({ type: 'single' }))
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(h.api().value).toEqual(['a'])
    h.api().getItem({ value: 'b' }).trigger.onPress!()
    expect(h.api().value).toEqual(['b'])
  })

  it('multiple: each item toggles independently', () => {
    const h = track(make({ type: 'multiple' }))
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    h.api().getItem({ value: 'c' }).trigger.onPress!()
    expect(h.api().value).toEqual(['a', 'c'])
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(h.api().value).toEqual(['c'])
  })
})

// -----------------------------------------------------------------------------
// Collapsible
// -----------------------------------------------------------------------------

describe('collapsible (single mode)', () => {
  it('non-collapsible: clicking the open item keeps it open', () => {
    const h = track(make({ type: 'single', collapsible: false }))
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(h.api().value).toEqual(['a'])
    // Click the already-open item — should stay open.
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(h.api().value).toEqual(['a'])
  })

  it('collapsible: clicking the open item closes it', () => {
    const h = track(make({ type: 'single', collapsible: true }))
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(h.api().value).toEqual(['a'])
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(h.api().value).toEqual([])
  })

  it('multiple ignores collapsible (always toggles)', () => {
    const h = track(make({ type: 'multiple', collapsible: false }))
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(h.api().value).toEqual([])
  })
})

// -----------------------------------------------------------------------------
// Disabled
// -----------------------------------------------------------------------------

describe('disabled', () => {
  it('a disabled item never toggles', () => {
    const h = track(make({ type: 'multiple' }))
    h.api().getItem({ value: 'b', disabled: true }).trigger.onPress!()
    expect(h.api().value).toEqual([])
  })

  it('a disabled accordion swallows all toggles', () => {
    const h = track(make({ type: 'multiple', disabled: true }))
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(h.api().value).toEqual([])
  })

  it('disabled trigger is not focusable + reports disabled', () => {
    const h = track(make({ disabled: true }))
    const trigger = h.api().getItem({ value: 'a' }).trigger
    expect(trigger.focusable).toBe(false)
    expect(trigger.disabled).toBe(true)
  })
})

// -----------------------------------------------------------------------------
// Header navigation
// -----------------------------------------------------------------------------

describe('header navigation', () => {
  it('next / prev move between enabled triggers', () => {
    const h = track(make())
    expect(h.api().navigate('a', 'next')).toBe('b')
    expect(h.api().navigate('b', 'prev')).toBe('a')
  })

  it('first / last jump to the ends', () => {
    const h = track(make())
    expect(h.api().navigate('b', 'first')).toBe('a')
    expect(h.api().navigate('b', 'last')).toBe('c')
  })

  it('skips disabled triggers', () => {
    const items: AccordionItemProps[] = [
      { value: 'a' },
      { value: 'b', disabled: true },
      { value: 'c' },
    ]
    const h = track(make({}, items))
    expect(h.api().navigate('a', 'next')).toBe('c')
    expect(h.api().navigate('c', 'prev')).toBe('a')
  })

  it('loop wraps at the boundaries', () => {
    const h = track(make({ loop: true }))
    expect(h.api().navigate('c', 'next')).toBe('a')
    expect(h.api().navigate('a', 'prev')).toBe('c')
  })

  it('no-loop stops at the boundaries', () => {
    const h = track(make({ loop: false }))
    expect(h.api().navigate('c', 'next')).toBeNull()
    expect(h.api().navigate('a', 'prev')).toBeNull()
  })

  it('navigation never changes the open set', () => {
    const h = track(make())
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    h.api().navigate('a', 'next')
    expect(h.api().value).toEqual(['a'])
  })
})

// -----------------------------------------------------------------------------
// Accessibility (connect output)
// -----------------------------------------------------------------------------

describe('accessibility', () => {
  it('trigger reports expanded + controls its content', () => {
    const h = track(make({ type: 'multiple' }))
    let part = h.api().getItem({ value: 'a' })
    expect(part.trigger.role).toBe('button')
    expect(part.trigger.expanded).toBe(false)
    expect(part.trigger.controls).toBe(part.content.id)

    h.api().getItem({ value: 'a' }).trigger.onPress!()
    part = h.api().getItem({ value: 'a' })
    expect(part.trigger.expanded).toBe(true)
  })

  it('content is a region labelled by its trigger and hidden when closed', () => {
    const h = track(make({ type: 'multiple' }))
    let part = h.api().getItem({ value: 'a' })
    expect(part.content.role).toBe('region')
    expect(part.content.labelledBy).toBe(part.trigger.id)
    expect(part.content.hidden).toBe(true)

    h.api().getItem({ value: 'a' }).trigger.onPress!()
    part = h.api().getItem({ value: 'a' })
    expect(part.content.hidden).toBe(false)
    expect(part.content.open).toBe(true)
  })

  it('header carries the heading role', () => {
    const h = track(make())
    expect(h.api().getItem({ value: 'a' }).header.role).toBe('heading')
  })
})

// -----------------------------------------------------------------------------
// Controlled / uncontrolled
// -----------------------------------------------------------------------------

describe('controlled / uncontrolled', () => {
  it('seeds the open set from defaultValue (multiple)', () => {
    const h = track(make({ type: 'multiple', defaultValue: ['a', 'c'] }))
    expect(h.api().value).toEqual(['a', 'c'])
  })

  it('single mode clamps a multi-value seed to one', () => {
    const h = track(make({ type: 'single', defaultValue: ['a', 'b'] }))
    expect(h.api().value).toEqual(['a'])
  })

  it('fires onValueChange on every open-set change', () => {
    const onValueChange = vi.fn()
    const h = track(make({ type: 'multiple', onValueChange }))
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    expect(onValueChange).toHaveBeenLastCalledWith({ value: ['a'] })
    h.api().getItem({ value: 'b' }).trigger.onPress!()
    expect(onValueChange).toHaveBeenLastCalledWith({ value: ['a', 'b'] })
  })

  it('does not fire onValueChange on a no-op toggle (single non-collapsible)', () => {
    const onValueChange = vi.fn()
    const h = track(make({ type: 'single', collapsible: false, onValueChange }))
    h.api().getItem({ value: 'a' }).trigger.onPress!()
    onValueChange.mockClear()
    h.api().getItem({ value: 'a' }).trigger.onPress!() // already open, no change
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('setValue replaces the open set (clamped in single mode)', () => {
    const h = track(make({ type: 'single' }))
    h.api().setValue(['b', 'c'])
    expect(h.api().value).toEqual(['b'])
  })
})
