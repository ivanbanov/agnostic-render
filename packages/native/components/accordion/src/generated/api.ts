/* eslint-disable */
import { useMachine } from '@render-experiment/machine-native'
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
  // useMachine runs the component's prop-dependent effects (back-button, …)
  // internally — one useEffect each, keyed on their named prop deps.
  const { api } = useMachine(
    accordionMachineConfig,
    connectAccordion,
    accordionEffects,
    accordionProps,
  )
  return api
}
