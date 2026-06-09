/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Accordion } from '@render-experiment/accordion-react'

/**
 * React DOM tests for the Accordion. Covers the behavioral contract enumerated
 * in packages/core/components/accordion/SPEC.md at the rendered-view level
 * (toggle, mode, collapsible, header navigation, a11y, unmount-when-closed).
 */

afterEach(() => {
  cleanup()
})

function Three(props: Omit<React.ComponentProps<typeof Accordion>, 'children'>) {
  return (
    <Accordion {...props}>
      {(['a', 'b', 'c'] as const).map(v => (
        <Accordion.Item key={v} value={v}>
          <Accordion.Header>
            <Accordion.Trigger>Trigger {v.toUpperCase()}</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>Panel {v.toUpperCase()}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  )
}

// -----------------------------------------------------------------------------
// toggle + mode
// -----------------------------------------------------------------------------

describe('toggle + mode', () => {
  it('opens a panel on trigger click (closed panels are unmounted)', () => {
    render(<Three type='multiple' />)
    expect(screen.queryByText('Panel A')).toBeNull()
    fireEvent.click(screen.getByText('Trigger A'))
    expect(screen.getByText('Panel A')).toBeTruthy()
  })

  it('single: opening one closes the previous', () => {
    render(<Three type='single' />)
    fireEvent.click(screen.getByText('Trigger A'))
    expect(screen.getByText('Panel A')).toBeTruthy()
    fireEvent.click(screen.getByText('Trigger B'))
    expect(screen.queryByText('Panel A')).toBeNull()
    expect(screen.getByText('Panel B')).toBeTruthy()
  })

  it('multiple: panels open independently', () => {
    render(<Three type='multiple' />)
    fireEvent.click(screen.getByText('Trigger A'))
    fireEvent.click(screen.getByText('Trigger C'))
    expect(screen.getByText('Panel A')).toBeTruthy()
    expect(screen.getByText('Panel C')).toBeTruthy()
  })
})

describe('collapsible', () => {
  it('non-collapsible single keeps the open panel open on re-click', () => {
    render(<Three type='single' collapsible={false} />)
    fireEvent.click(screen.getByText('Trigger A'))
    fireEvent.click(screen.getByText('Trigger A'))
    expect(screen.getByText('Panel A')).toBeTruthy()
  })

  it('collapsible single closes the open panel on re-click', () => {
    render(<Three type='single' collapsible />)
    fireEvent.click(screen.getByText('Trigger A'))
    fireEvent.click(screen.getByText('Trigger A'))
    expect(screen.queryByText('Panel A')).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// header navigation
// -----------------------------------------------------------------------------

describe('header navigation', () => {
  it('ArrowDown / ArrowUp move focus between triggers', () => {
    render(<Three type='single' />)
    const a = screen.getByText('Trigger A')
    const b = screen.getByText('Trigger B')
    a.focus()
    fireEvent.keyDown(a, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(b)
    fireEvent.keyDown(b, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(a)
  })

  it('Home / End jump to the first / last trigger', () => {
    render(<Three type='single' />)
    const a = screen.getByText('Trigger A')
    const c = screen.getByText('Trigger C')
    a.focus()
    fireEvent.keyDown(a, { key: 'End' })
    expect(document.activeElement).toBe(c)
    fireEvent.keyDown(c, { key: 'Home' })
    expect(document.activeElement).toBe(a)
  })

  it('navigation does not toggle a panel', () => {
    render(<Three type='multiple' />)
    const a = screen.getByText('Trigger A')
    a.focus()
    fireEvent.keyDown(a, { key: 'ArrowDown' })
    expect(screen.queryByText('Panel A')).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// accessibility
// -----------------------------------------------------------------------------

describe('accessibility', () => {
  it('trigger reports aria-expanded + aria-controls; open panel is a region', () => {
    render(<Three type='multiple' />)
    const trigger = screen.getByText('Trigger A')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    const region = screen.getByRole('region')
    expect(region.getAttribute('aria-labelledby')).toBe(trigger.getAttribute('id'))
  })

  it('disabled item does not toggle and is aria-disabled', () => {
    render(
      <Accordion type='multiple'>
        <Accordion.Item value='a' disabled>
          <Accordion.Header>
            <Accordion.Trigger>Trigger A</Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>Panel A</Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    )
    const trigger = screen.getByText('Trigger A')
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(trigger)
    expect(screen.queryByText('Panel A')).toBeNull()
  })
})

// -----------------------------------------------------------------------------
// controlled
// -----------------------------------------------------------------------------

describe('controlled', () => {
  it('fires onValueChange with the next open set', () => {
    const onValueChange = vi.fn()
    render(<Three type='multiple' onValueChange={onValueChange} />)
    fireEvent.click(screen.getByText('Trigger B'))
    expect(onValueChange).toHaveBeenLastCalledWith({ value: ['b'] })
  })

  it('seeds open panels from defaultValue', () => {
    render(<Three type='multiple' defaultValue={['b']} />)
    expect(screen.getByText('Panel B')).toBeTruthy()
  })
})
