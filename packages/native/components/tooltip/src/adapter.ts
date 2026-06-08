import type { Adapter } from '@render-experiment/machine-core'
import type { TooltipComputed, TooltipContext, TooltipEvent } from '@render-experiment/tooltip-core'

export const tooltipAdapter: Adapter<TooltipContext, TooltipEvent, TooltipComputed> = {}
