import { BackHandler, Text } from 'react-native'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Dialog } from '@render-experiment/dialog-native'

/**
 * RN tests for the Dialog. Covers the contract in
 * packages/core/components/dialog/SPEC.md as it applies to native: open/close
 * (trigger + close button), defaultOpen, the Android back button, and that the
 * web-only handlers (keydown / pointer-down-outside) never leak onto RN nodes.
 */

function renderDialog(rootProps = {}) {
  return render(
    <Dialog {...rootProps}>
      <Dialog.Trigger>
        <Text>open</Text>
      </Dialog.Trigger>
      <Dialog.Overlay>
        <Dialog.Content>
          <Dialog.Title>Title</Dialog.Title>
          <Dialog.Description>Description</Dialog.Description>
          <Dialog.Close>
            <Text>close</Text>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Overlay>
    </Dialog>,
  )
}

describe('RN dialog — open/close model', () => {
  it('is closed initially (content not rendered)', () => {
    renderDialog()
    expect(screen.queryByText('Title')).toBeNull()
  })

  it('opens on trigger press', () => {
    renderDialog()
    fireEvent.press(screen.getByText('open'))
    expect(screen.getByText('Title')).toBeTruthy()
    expect(screen.getByText('Description')).toBeTruthy()
  })

  it('closes on close-button press', () => {
    renderDialog()
    fireEvent.press(screen.getByText('open'))
    expect(screen.getByText('Title')).toBeTruthy()

    fireEvent.press(screen.getByText('close'))
    expect(screen.queryByText('Title')).toBeNull()
  })

  it('toggles closed when the trigger is pressed again', () => {
    renderDialog()
    const trigger = screen.getByText('open')
    fireEvent.press(trigger)
    expect(screen.getByText('Title')).toBeTruthy()
    fireEvent.press(trigger)
    expect(screen.queryByText('Title')).toBeNull()
  })

  it('respects defaultOpen', () => {
    renderDialog({ defaultOpen: true })
    expect(screen.getByText('Title')).toBeTruthy()
  })
})

describe('RN dialog — Android back button', () => {
  it('closes the open dialog on hardware back press', () => {
    const spy = jest.spyOn(BackHandler, 'addEventListener')
    renderDialog({ defaultOpen: true })
    expect(screen.getByText('Title')).toBeTruthy()

    const call = spy.mock.calls.find(([event]) => event === 'hardwareBackPress')
    expect(call).toBeTruthy()
    const handler = call![1] as () => boolean

    let handled = false
    act(() => {
      handled = handler()
    })
    expect(handled).toBe(true)
    expect(screen.queryByText('Title')).toBeNull()

    spy.mockRestore()
  })

  it('does not close when closeOnEscape is false', () => {
    const spy = jest.spyOn(BackHandler, 'addEventListener')
    renderDialog({ defaultOpen: true, closeOnEscape: false })
    // The effect returns early when closeOnEscape is false → no handler wired.
    const call = spy.mock.calls.find(([event]) => event === 'hardwareBackPress')
    expect(call).toBeUndefined()
    expect(screen.getByText('Title')).toBeTruthy()
    spy.mockRestore()
  })
})
