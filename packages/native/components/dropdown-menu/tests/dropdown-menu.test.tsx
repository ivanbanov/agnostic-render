/**
 * React Native substrate tests for the DropdownMenu view.
 *
 * RN-specific behaviors the web tests can't cover:
 *   - Tap-to-toggle the trigger (no hover/keyboard-open model).
 *   - Tapping an item fires onSelect and closes (closeOnSelect default).
 *   - Content renders inline only while open.
 *   - Android hardware back closes the menu (BackHandler).
 *   - focusTrap is inert on RN: there is no Tab key, and the content
 *     attaches no key handler regardless of the prop.
 *
 * The keyboard/typeahead/closeOnSelect state machine is covered framework-
 * free in core/components/dropdown-menu/tests/machine.test.ts; here we only
 * check the RN view wires it up and respects substrate constraints.
 */
import { BackHandler, Text } from 'react-native'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { DropdownMenu } from '@render-experiment/dropdown-menu-native'

function renderMenu(rootProps = {}, onSelect?: (e: { preventDefault: () => void }) => void) {
  return render(
    <DropdownMenu {...rootProps}>
      <DropdownMenu.Trigger>
        <Text>open</Text>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item value='a' onSelect={onSelect}>
          <Text>Item A</Text>
        </DropdownMenu.Item>
        <DropdownMenu.Item value='b'>
          <Text>Item B</Text>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>,
  )
}

describe('RN dropdown — open/close model', () => {
  it('is closed initially', () => {
    renderMenu()
    expect(screen.queryByText('Item A')).toBeNull()
  })

  it('taps the trigger to open, taps again to close', () => {
    renderMenu()
    const trigger = screen.getByText('open')

    fireEvent.press(trigger)
    expect(screen.getByText('Item A')).toBeTruthy()

    fireEvent.press(trigger)
    expect(screen.queryByText('Item A')).toBeNull()
  })

  it('respects defaultOpen', () => {
    renderMenu({ defaultOpen: true })
    expect(screen.getByText('Item A')).toBeTruthy()
  })
})

describe('RN dropdown — item activation', () => {
  it('tapping an item fires onSelect and closes (closeOnSelect default)', () => {
    const onSelect = jest.fn()
    renderMenu({ defaultOpen: true }, onSelect)

    fireEvent.press(screen.getByText('Item A'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Item A')).toBeNull()
  })

  it('closeOnSelect=false keeps the menu open after activation', () => {
    const onSelect = jest.fn()
    renderMenu({ defaultOpen: true, closeOnSelect: false }, onSelect)

    fireEvent.press(screen.getByText('Item A'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Item A')).toBeTruthy()
  })
})

describe('RN dropdown — focusTrap is inert on RN', () => {
  it('attaches no key handler to the content regardless of focusTrap', () => {
    // RN has no Tab key; the focusTrap prop must not produce a key handler.
    for (const focusTrap of [false, true]) {
      const { unmount } = renderMenu({ defaultOpen: true, focusTrap })
      const root = screen.UNSAFE_root
      const withKeyHandler = root.findAll(
        (node: { props?: Record<string, unknown> }) =>
          node.props?.onKeyDown !== undefined || node.props?.onKeyUp !== undefined,
      )
      expect(withKeyHandler).toHaveLength(0)
      unmount()
    }
  })
})

describe('RN dropdown — Android back button', () => {
  it('closes the open menu on hardware back press', () => {
    const spy = jest.spyOn(BackHandler, 'addEventListener')
    renderMenu({ defaultOpen: true })
    expect(screen.getByText('Item A')).toBeTruthy()

    const call = spy.mock.calls.find(
      ([event]: [string, ...unknown[]]) => event === 'hardwareBackPress',
    )
    expect(call).toBeTruthy()
    const handler = call![1] as () => boolean

    let handled = false
    act(() => {
      handled = handler()
    })
    expect(handled).toBe(true)
    expect(screen.queryByText('Item A')).toBeNull()

    spy.mockRestore()
  })
})
