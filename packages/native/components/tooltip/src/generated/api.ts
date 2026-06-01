/* eslint-disable */
import { withAdapter } from '@render-experiment/machine-core'
import { useApi } from '@render-experiment/machine-native'
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

/** Wire the core machine to native and return the connect() API. */
export function useTooltipApi(props: TooltipProps): TooltipApi {
  return useApi<TooltipMachineContext, TooltipProps, TooltipState, TooltipApi, TooltipEvent>(
    tooltipMachineWithAdapter,
    props,
    connectTooltip,
  )
}
