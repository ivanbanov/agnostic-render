/* eslint-disable */
import { useMachine } from '@render-experiment/machine-native'
import {
  TOOLTIP_DEFAULTS,
  connectTooltip,
  tooltipMachineConfig,
  type TooltipApi,
  type TooltipMachineProps,
  type TooltipProps,
} from '@render-experiment/tooltip-core'
import { tooltipEffects } from '../effects'

/** Wire the core tooltip machine to native and return the connect() API. */
export function useTooltipApi(props: TooltipProps): TooltipApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const tooltipProps: TooltipMachineProps = { ...TOOLTIP_DEFAULTS, ...props }
  // useMachine runs the component's prop-dependent effects (back-button, …)
  // internally — one useEffect each, keyed on their named prop deps.
  const { api } = useMachine(tooltipMachineConfig, connectTooltip, tooltipEffects, tooltipProps)
  return api
}
