import { BackHandler } from 'react-native'
import type { ComponentEffect } from '@render-experiment/machine-native'
import type {
  DropdownMenuMachine,
  DropdownMenuMachineProps,
} from '@render-experiment/dropdown-menu-core'

type DropdownMenuEffect = ComponentEffect<DropdownMenuMachine, DropdownMenuMachineProps>

/**
 * RN analog of the web Escape listener: the Android hardware back button closes
 * the open menu. Gated by `closeOnEscape`; on accept it sends the plain
 * `escape` event the machine already handles. Prop-dependent, so it's a
 * ComponentEffect (the generated useApi owns the useEffect via useEffects).
 */
const trackBackButton: DropdownMenuEffect = [
  (machine, props) => {
    if (!props.closeOnEscape) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!machine.matches('open')) return false
      machine.send({ type: 'escape', src: 'backhandler' })
      return true // handled — don't let the app exit
    })
    return () => sub.remove()
  },
  ['closeOnEscape'],
]

export const dropdownMenuEffects = [trackBackButton]
