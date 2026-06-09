import { BackHandler } from 'react-native'
import type { ComponentEffect } from '@render-experiment/machine-native'
import {
  resolveEscape,
  type DialogMachine,
  type DialogMachineProps,
} from '@render-experiment/dialog-core'

type DialogEffect = ComponentEffect<DialogMachine, DialogMachineProps>

/**
 * RN analog of the web Escape listener: the Android hardware back button
 * dismisses the dialog. Gated by `closeOnEscape` (vetoable via `onEscapeKeyDown`
 * through the agnostic `resolveEscape`); on accept it sends the plain `escape`
 * event the machine already understands.
 */
const trackBackButton: DialogEffect = [
  (machine, props) => {
    if (!props.closeOnEscape) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const { close } = resolveEscape({
        closeOnEscape: props.closeOnEscape,
        state: machine.state,
        onEscapeKeyDown: props.onEscapeKeyDown,
      })
      if (!close) return false
      machine.send({ type: 'escape', src: 'backhandler' })
      return true // handled — don't let the app exit
    })
    return () => sub.remove()
  },
  ['closeOnEscape', 'onEscapeKeyDown'],
]

export const dialogEffects = [trackBackButton]
