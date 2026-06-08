import { Pressable, StyleSheet, Text, View } from 'react-native'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { styled } from '@render-experiment/style-engine-native/styled'

/** Flatten a testID node's style array into one object for assertions. */
function styleOf(testID: string): Record<string, unknown> {
  return StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<string, unknown>
}

describe('styled — base + variants', () => {
  it('applies the base style', () => {
    const Box = styled(View, { backgroundColor: '#357', width: 10 })
    render(<Box testID='box' />)
    expect(styleOf('box')).toMatchObject({ backgroundColor: '#357', width: 10 })
  })

  it('resolves variants from props and does not leak the variant prop', () => {
    const Box = styled(View, {
      variants: {
        tone: { primary: { backgroundColor: 'blue' }, danger: { backgroundColor: 'red' } },
      },
    })
    render(<Box testID='box' tone='danger' />)
    expect(styleOf('box')).toMatchObject({ backgroundColor: 'red' })
    // `tone` is consumed, not forwarded onto the View.
    expect(screen.getByTestId('box').props.tone).toBeUndefined()
  })

  it('honors defaultVariants', () => {
    const Box = styled(View, {
      variants: {
        tone: { primary: { backgroundColor: 'blue' }, danger: { backgroundColor: 'red' } },
      },
      defaultVariants: { tone: 'primary' },
    })
    render(<Box testID='box' />)
    expect(styleOf('box')).toMatchObject({ backgroundColor: 'blue' })
  })

  it('layers consumer style on top of the resolved style', () => {
    const Box = styled(View, { backgroundColor: 'blue', width: 10 })
    render(<Box testID='box' style={{ backgroundColor: 'red' }} />)
    const s = styleOf('box')
    expect(s.backgroundColor).toBe('red') // consumer wins
    expect(s.width).toBe(10) // base preserved
  })

  it('forwards non-variant props to the element', () => {
    const Box = styled(View, { width: 10 })
    render(<Box testID='box' accessibilityLabel='hi' />)
    expect(screen.getByTestId('box').props.accessibilityLabel).toBe('hi')
  })
})

describe('styled — conditions', () => {
  it('applies _pressed while pressed and reverts on release', () => {
    const Btn = styled(Pressable, {
      backgroundColor: 'white',
      _pressed: { backgroundColor: 'blue' },
    })
    render(
      <Btn testID='btn'>
        <Text>tap</Text>
      </Btn>,
    )
    expect(styleOf('btn')).toMatchObject({ backgroundColor: 'white' })

    fireEvent(screen.getByTestId('btn'), 'pressIn')
    expect(styleOf('btn')).toMatchObject({ backgroundColor: 'blue' })

    fireEvent(screen.getByTestId('btn'), 'pressOut')
    expect(styleOf('btn')).toMatchObject({ backgroundColor: 'white' })
  })

  it('applies _disabled from the disabled prop', () => {
    const Btn = styled(Pressable, {
      backgroundColor: 'white',
      _disabled: { backgroundColor: 'gray' },
    })
    render(
      <Btn testID='btn' disabled>
        <Text>x</Text>
      </Btn>,
    )
    expect(styleOf('btn')).toMatchObject({ backgroundColor: 'gray' })
  })

  it('still calls the consumer onPressIn when wiring _pressed', () => {
    const onPressIn = jest.fn()
    const Btn = styled(Pressable, { _pressed: { backgroundColor: 'blue' } })
    render(
      <Btn testID='btn' onPressIn={onPressIn}>
        <Text>x</Text>
      </Btn>,
    )
    fireEvent(screen.getByTestId('btn'), 'pressIn')
    expect(onPressIn).toHaveBeenCalledTimes(1)
  })
})

describe('styled — composition + options', () => {
  it('composes a styled base with extra styles', () => {
    const Base = styled(View, { backgroundColor: 'white', width: 10 })
    const Primary = styled(Base, { backgroundColor: 'blue' })
    render(<Primary testID='box' />)
    expect(styleOf('box')).toMatchObject({ backgroundColor: 'blue', width: 10 })
  })

  it('applies defaultProps', () => {
    const Box = styled(View, { width: 10 }, { defaultProps: { accessibilityLabel: 'def' } })
    render(<Box testID='box' />)
    expect(screen.getByTestId('box').props.accessibilityLabel).toBe('def')
  })

  it('shouldForwardProp can withhold a prop from the element', () => {
    const Box = styled(View, { width: 10 }, { shouldForwardProp: p => p !== 'accessibilityLabel' })
    render(<Box testID='box' accessibilityLabel='nope' />)
    expect(screen.getByTestId('box').props.accessibilityLabel).toBeUndefined()
  })
})
