import type { ComponentEffect } from '@render-experiment/machine-react'
import {
  resolveEscape,
  type TooltipMachine,
  type TooltipMachineProps,
} from '@render-experiment/tooltip-core'

type TooltipEffect = ComponentEffect<TooltipMachine, TooltipMachineProps>

const trackEscape: TooltipEffect = [
  (machine, props) => {
    const { closeOnEscape, onEscapeKeyDown } = props
    if (!closeOnEscape) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const { close } = resolveEscape({ closeOnEscape, state: machine.state, onEscapeKeyDown })
      if (!close) return
      event.stopPropagation()
      machine.send({ type: 'escape', src: 'keydown.escape' })
    }
    // Capture phase: run before consumer popovers/dialogs that also listen.
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  },
  ['closeOnEscape', 'onEscapeKeyDown'],
]

export const tooltipEffects = [trackEscape]
