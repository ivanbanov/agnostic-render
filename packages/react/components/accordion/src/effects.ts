import type { ComponentEffect } from '@render-experiment/machine-react'
import type { AccordionMachine, AccordionMachineProps } from '@render-experiment/accordion-core'

export type AccordionEffect = ComponentEffect<AccordionMachine, AccordionMachineProps>

export const accordionEffects: AccordionEffect[] = []
