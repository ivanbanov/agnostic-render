/* eslint-disable */
import { useMachine, useEffects } from '@render-experiment/machine-native'
import {
  ACCORDION_DEFAULTS,
  connectAccordion,
  accordionMachineConfig,
  type AccordionApi,
  type AccordionMachineProps,
  type AccordionProps,
} from '@render-experiment/accordion-core'
import { accordionEffects } from '../effects'

/** Wire the core accordion machine to native and return the connect() API. */
export function useAccordionApi(props: AccordionProps): AccordionApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const accordionProps: AccordionMachineProps = { ...ACCORDION_DEFAULTS, ...props }
  const { api, machine } = useMachine(accordionMachineConfig, connectAccordion, accordionProps)
  // Substrate-specific transport declared as a ComponentEffect; useEffects owns
  // the React effect + builds its dep array.
  useEffects(machine, accordionEffects, accordionProps)
  return api
}
