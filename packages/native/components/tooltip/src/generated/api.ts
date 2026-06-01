/* eslint-disable */
import { withAdapter } from '@render-experiment/machine-core'
import { useApi } from '@render-experiment/machine-native'
import {
  connectTooltip,
  tooltipMachine,
  TOOLTIP_DEFAULTS,
  type TooltipApi,
  type TooltipContext as TooltipMachineContext,
  type TooltipEvent,
  type TooltipMachineProps,
  type TooltipProps,
  type TooltipState,
} from '@render-experiment/tooltip-core'
import { tooltipAdapter } from '../adapter'

const tooltipMachineWithAdapter = withAdapter(tooltipMachine, tooltipAdapter)

/** Wire the core machine to native and return the connect() API. */
export function useTooltipApi(props: TooltipProps): TooltipApi {
  // Resolve defaults ONCE here; the machine + connect receive concrete config.
  const config: TooltipMachineProps = { ...TOOLTIP_DEFAULTS, ...props }
  return useApi(tooltipMachineWithAdapter, config, connectTooltip)
}
