/* eslint-disable */
import { useMachine, useEffects } from '@render-experiment/machine-react'
import {
  DROPDOWN_MENU_DEFAULTS,
  connectDropdownMenu,
  dropdownMenuMachineConfig,
  type DropdownMenuApi,
  type DropdownMenuMachineProps,
  type DropdownMenuProps,
} from '@render-experiment/dropdown-menu-core'
import { dropdownMenuAdapter } from '../adapter'
import { dropdownMenuEffects } from '../effects'

/** Wire the core dropdownMenu machine to React and return the connect() API. */
export function useDropdownMenuApi(props: DropdownMenuProps): DropdownMenuApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const dropdownMenuProps: DropdownMenuMachineProps = { ...DROPDOWN_MENU_DEFAULTS, ...props }
  const { api, machine } = useMachine(
    dropdownMenuMachineConfig,
    connectDropdownMenu,
    dropdownMenuAdapter,
    dropdownMenuProps,
  )
  // Substrate-specific transport (Escape, back-button, …) declared as a
  // ComponentEffect; useEffects owns the React effect + builds its dep array.
  useEffects(machine, dropdownMenuEffects, dropdownMenuProps)
  return api
}
