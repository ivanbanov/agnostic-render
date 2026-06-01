/**
 * React DOM adapter for Tooltip.
 *
 * Implements effects that the core machine declares as placeholders but
 * can't implement portably (DOM listeners, browser-only APIs). The
 * generated api.ts merges this map into the machine via withAdapter()
 * before useMachine.
 */
import type { Adapter } from '@render-experiment/machine-core'
import type {
  TooltipContext,
  TooltipEvent,
  TooltipMachineProps,
} from '@render-experiment/tooltip-core'

export const tooltipAdapter: Adapter<TooltipContext, TooltipMachineProps, TooltipEvent> = {
  // Listen for Escape while the tooltip is open. Capture-phase so we run
  // before consumer popovers/dialogs that might also listen.
  //
  // Calls `onEscapeKeyDown` first with a small cancelable event so
  // consumers can `preventDefault()` to keep the tooltip open. If they
  // do, no close event is sent.
  trackEscapeKey: ({ props: r, send }) => {
    if (!r.closeOnEscape) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      const cb = r.onEscapeKeyDown
      if (cb) {
        let prevented = false
        cb({
          preventDefault: () => {
            prevented = true
          },
          get defaultPrevented() {
            return prevented
          },
        })
        if (prevented) return
      }
      send({ type: 'close', src: 'keydown.escape' })
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  },
}
