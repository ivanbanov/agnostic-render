import { Text } from 'react-native'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { Accordion } from '@render-experiment/accordion-native'

function renderAccordion(rootProps = {}) {
  return render(
    <Accordion {...rootProps}>
      {(['a', 'b'] as const).map(v => (
        <Accordion.Item key={v} value={v}>
          <Accordion.Header>
            <Accordion.Trigger>
              <Text>Trigger {v.toUpperCase()}</Text>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <Text>Panel {v.toUpperCase()}</Text>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>,
  )
}

describe('RN accordion — toggle model', () => {
  it('is closed initially (panels unmounted)', () => {
    renderAccordion({ type: 'multiple' })
    expect(screen.queryByText('Panel A')).toBeNull()
  })

  it('taps a trigger to open, taps again to close (collapsible single)', () => {
    renderAccordion({ type: 'single', collapsible: true })
    const trigger = screen.getByText('Trigger A')
    fireEvent.press(trigger)
    expect(screen.getByText('Panel A')).toBeTruthy()
    fireEvent.press(trigger)
    expect(screen.queryByText('Panel A')).toBeNull()
  })

  it('single mode keeps at most one panel open', () => {
    renderAccordion({ type: 'single' })
    fireEvent.press(screen.getByText('Trigger A'))
    expect(screen.getByText('Panel A')).toBeTruthy()
    fireEvent.press(screen.getByText('Trigger B'))
    expect(screen.queryByText('Panel A')).toBeNull()
    expect(screen.getByText('Panel B')).toBeTruthy()
  })

  it('multiple mode opens panels independently', () => {
    renderAccordion({ type: 'multiple' })
    fireEvent.press(screen.getByText('Trigger A'))
    fireEvent.press(screen.getByText('Trigger B'))
    expect(screen.getByText('Panel A')).toBeTruthy()
    expect(screen.getByText('Panel B')).toBeTruthy()
  })

  it('seeds open panels from defaultValue', () => {
    renderAccordion({ type: 'multiple', defaultValue: ['b'] })
    expect(screen.getByText('Panel B')).toBeTruthy()
  })

  it('a disabled item does not toggle', () => {
    render(
      <Accordion type='multiple'>
        <Accordion.Item value='a' disabled>
          <Accordion.Header>
            <Accordion.Trigger>
              <Text>Trigger A</Text>
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content>
            <Text>Panel A</Text>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>,
    )
    fireEvent.press(screen.getByText('Trigger A'))
    expect(screen.queryByText('Panel A')).toBeNull()
  })
})
