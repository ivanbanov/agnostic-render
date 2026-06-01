/* eslint-disable */
import { withAdapter } from '@render-experiment/machine-core'
import { createRuntime, type Runtime } from '@render-experiment/machine-pixi'
import {
  connectTooltip,
  tooltipMachine,
  type TooltipApi,
  type TooltipContext as TooltipMachineContext,
  type TooltipEvent,
  type TooltipProps,
  type TooltipState,
} from '@render-experiment/tooltip-core'
import { tooltipAdapter } from '../adapter'

const tooltipMachineWithAdapter = withAdapter<TooltipMachineContext, TooltipProps, TooltipEvent>(
  tooltipMachine,
  tooltipAdapter,
)

/**
 * Pixi version: not a hook (no React). Returns a runtime + a getApi()
 * that's cached by the machine's version counter — calls are cheap as
 * long as nothing has changed.
 */
export type TooltipBridge = Runtime<TooltipMachineContext, TooltipProps, TooltipApi, TooltipEvent>

export function createTooltipBridge(props: TooltipProps): TooltipBridge {
  return createRuntime<TooltipMachineContext, TooltipProps, TooltipState, TooltipApi, TooltipEvent>(
    tooltipMachineWithAdapter,
    props,
    connectTooltip,
  )
}
