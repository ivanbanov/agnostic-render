/* eslint-disable */
import { useMachine, useEffects } from '@render-experiment/machine-native'
import {
  DROPDOWN_MENU_DEFAULTS,
  connectDropdownMenu,
  dropdownMenuMachineConfig,
  type DropdownMenuApi,
  type DropdownMenuMachineProps,
  type DropdownMenuProps,
} from '@render-experiment/dropdown-menu-core'
import { dropdownMenuEffects } from '../effects'

/** Wire the core dropdownMenu machine to native and return the connect() API. */
export function useDropdownMenuApi(props: DropdownMenuProps): DropdownMenuApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const dropdownMenuProps: DropdownMenuMachineProps = { ...DROPDOWN_MENU_DEFAULTS, ...props }
  const { api, machine } = useMachine(
    dropdownMenuMachineConfig,
    connectDropdownMenu,
    dropdownMenuProps,
  )
  // Substrate-specific transport declared as a ComponentEffect; useEffects owns
  // the React effect + builds its dep array.
  useEffects(machine, dropdownMenuEffects, dropdownMenuProps)
  return api
}
