import type { ComponentEffect } from '@render-experiment/machine-react'
import {
  resolveEscape,
  type DialogMachine,
  type DialogMachineProps,
} from '@render-experiment/dialog-core'

type DialogEffect = ComponentEffect<DialogMachine, DialogMachineProps>

/**
 * Capture-phase Escape closer — runs before nested popovers/dialogs that might
 * also listen. Gated by `closeOnEscape`; on accept it sends the plain `escape`
 * event the machine handles. This is the only prop-dependent listener that needs
 * nothing but (machine, props), so it's a ComponentEffect. Focus trap / initial
 * focus / focus return / scroll lock / outside-pointer-down all need DOM refs,
 * so they live in the Content render instead.
 */
const trackEscape: DialogEffect = [
  (machine, props) => {
    if (!props.closeOnEscape) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const { close } = resolveEscape({
        closeOnEscape: props.closeOnEscape,
        state: machine.state,
        onEscapeKeyDown: props.onEscapeKeyDown,
      })
      if (!close) return
      event.stopPropagation()
      machine.send({ type: 'escape', src: 'keydown.escape' })
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  },
  ['closeOnEscape', 'onEscapeKeyDown'],
]

export const dialogEffects = [trackEscape]
