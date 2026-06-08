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
import { dropdownMenuAdapter } from '../adapter'
import { dropdownMenuEffects } from '../effects'

/** Wire the core dropdownMenu machine to native and return the connect() API. */
export function useDropdownMenuApi(props: DropdownMenuProps): DropdownMenuApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const resolved: DropdownMenuMachineProps = { ...DROPDOWN_MENU_DEFAULTS, ...props }
  const { api, machine } = useMachine(
    dropdownMenuMachineConfig,
    connectDropdownMenu,
    dropdownMenuAdapter,
    resolved,
  )
  // Substrate-specific transport declared as a ComponentEffect; useEffects owns
  // the React effect + builds its dep array.
  useEffects(dropdownMenuEffects, machine, resolved)
  return api
}
