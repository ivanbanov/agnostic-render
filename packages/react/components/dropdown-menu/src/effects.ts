import type { ComponentEffect } from '@render-experiment/machine-react'
import type {
  DropdownMenuMachine,
  DropdownMenuMachineProps,
} from '@render-experiment/dropdown-menu-core'

type DropdownMenuEffect = ComponentEffect<DropdownMenuMachine, DropdownMenuMachineProps>

/**
 * Capture-phase Escape closer — runs before nested popovers/dialogs that might
 * also listen. Gated by `closeOnEscape`; on accept it sends the plain `escape`
 * event the machine already handles. Prop-dependent, so it's a ComponentEffect
 * (the generated useApi runs it via useMachine), not a core config effect.
 */
const trackEscape: DropdownMenuEffect = [
  (machine, props) => {
    if (!props.closeOnEscape) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      // Only a visible menu is dismissible.
      if (!machine.matches('open')) return
      event.stopPropagation()
      machine.send({ type: 'escape', src: 'keydown.escape' })
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  },
  ['closeOnEscape'],
]

export const dropdownMenuEffects = [trackEscape]
