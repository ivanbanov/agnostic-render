/* eslint-disable */
import { useMachine, useEffects } from '@render-experiment/machine-react'
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

export function useTooltipApi(props: TooltipProps): TooltipApi {
  const propsWithDefaults: TooltipMachineProps = { ...TOOLTIP_DEFAULTS, ...props }
  const { api, machine } = useMachine(
    tooltipMachineConfig,
    connectTooltip,
    tooltipAdapter,
    propsWithDefaults,
  )

  useEffects(tooltipEffects, machine, propsWithDefaults)
  return api
}
