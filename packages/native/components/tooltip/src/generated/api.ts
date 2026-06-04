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
import { tooltipAdapter, useTooltipEffects } from '../adapter'

/** Wire the core tooltip machine to native and return the connect() API. */
export function useTooltipApi(props: TooltipProps): TooltipApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const resolved: TooltipMachineProps = { ...TOOLTIP_DEFAULTS, ...props }
  const { api, machine } = useMachine(
    tooltipMachineConfig,
    connectTooltip,
    tooltipAdapter,
    resolved,
  )
  // Substrate-specific, prop-dependent effects (e.g. Android back button).
  useTooltipEffects(machine, resolved)
  return api
}
