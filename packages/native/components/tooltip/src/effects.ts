import { BackHandler } from 'react-native'
import type { ComponentEffect } from '@render-experiment/machine-native'
import {
  resolveEscape,
  type TooltipMachine,
  type TooltipMachineProps,
} from '@render-experiment/tooltip-core'

type TooltipEffect = ComponentEffect<TooltipMachine, TooltipMachineProps>

/**
 * RN analog of the web Escape listener: the Android hardware back button
 * dismisses the tooltip. The dismiss DECISION is the same agnostic
 * `resolveEscape` (gated by `closeOnEscape`, vetoable via `onEscapeKeyDown`);
 * only the transport differs (BackHandler vs. DOM keydown). On accept it sends
 * the plain `escape` event the machine already understands.
 */
const trackBackButton: TooltipEffect = [
  (machine, props) => {
    const { closeOnEscape, onEscapeKeyDown } = props
    if (!closeOnEscape) return

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const { close } = resolveEscape({ closeOnEscape, state: machine.state, onEscapeKeyDown })
      if (!close) return false
      machine.send({ type: 'escape', src: 'backhandler' })
      return true // we handled it — don't let the app exit
    })
    return () => sub.remove()
  },
  ['closeOnEscape', 'onEscapeKeyDown'],
]

export const tooltipEffects = [trackBackButton]
