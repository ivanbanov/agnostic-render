/**
 * React DOM effects for Tooltip — substrate-specific transport the agnostic
 * machine can't own. Declared as a `ComponentEffect`: a plain setup/teardown
 * function plus the prop names it depends on. The generated `useApi` runs it
 * (it owns the `useEffect`), so component authors write no React here.
 *
 * Currently one effect: the Escape listener. It's transport only — it detects
 * the key, then defers the decision (enabled-gate + prevent-able veto) to the
 * agnostic `resolveEscape`, and on accept sends `escape` (the machine then
 * closes; behavior stays portable).
 */
import type { ComponentEffect } from '@render-experiment/machine-react'
import {
  resolveEscape,
  type TooltipMachine,
  type TooltipMachineProps,
} from '@render-experiment/tooltip-core'

export const tooltipEffects: ComponentEffect<TooltipMachine, TooltipMachineProps> = [
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
