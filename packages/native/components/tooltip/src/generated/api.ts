/* eslint-disable */
import { useMachine, useEffects } from '@render-experiment/machine-native'
import {
  TOOLTIP_DEFAULTS,
  connectTooltip,
  tooltipMachineConfig,
  type TooltipApi,
  type TooltipMachineProps,
  type TooltipProps,
} from '@render-experiment/tooltip-core'
import { tooltipAdapter } from '../adapter'
import { tooltipEffects } from '../effects'

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
  // Substrate-specific transport declared as a ComponentEffect; useEffects owns
  // the React effect + builds its dep array.
  useEffects(tooltipEffects, machine, resolved)
  return api
}
