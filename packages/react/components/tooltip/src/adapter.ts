/**
 * React DOM adapter for Tooltip — the substrate-specific pieces the agnostic
 * machine can't own.
 *
 *   - tooltipAdapter: the machine `Adapter` (named effect impls). The tooltip
 *     has no DOM-specific machine effects under the new model, so it's empty.
 *   - useTooltipEffects: the React effects hook the generated api calls. Owns
 *     the Escape listener — which needs props (closeOnEscape) and a
 *     prevent-able onEscapeKeyDown gate, so it lives here, not in the machine.
 *     On accept it sends `escape`; the machine then closes (portable behavior).
 */
import { useEffect } from 'react'
import type { Adapter } from '@render-experiment/machine-core'
import {
  resolveEscape,
  type TooltipContext,
  type TooltipEvent,
  type TooltipMachine,
  type TooltipMachineProps,
} from '@render-experiment/tooltip-core'

/** No DOM-specific machine effects for the tooltip under the new model. */
export const tooltipAdapter: Adapter<TooltipContext, TooltipEvent> = {}

/**
 * React-side, prop-dependent tooltip effects. Called by the generated api with
 * the running machine + current props.
 */
export function useTooltipEffects(machine: TooltipMachine, props: TooltipMachineProps): void {
  const { closeOnEscape, onEscapeKeyDown } = props

  useEffect(() => {
    if (!closeOnEscape) return
    // Transport only: detect the Escape key, then defer the decision (gate +
    // prevent-able veto) to the agnostic resolveEscape. Act on its verdict.
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
  }, [machine, closeOnEscape, onEscapeKeyDown])
}
