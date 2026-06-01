/* eslint-disable */
import { withAdapter } from '@render-experiment/machine-core'
import { useApi } from '@render-experiment/machine-react'
import {
  connectDropdownMenu,
  dropdownMenuMachine,
  DROPDOWN_MENU_DEFAULTS,
  type DropdownMenuApi,
  type DropdownMenuContext as DropdownMenuMachineContext,
  type DropdownMenuEvent,
  type DropdownMenuMachineProps,
  type DropdownMenuProps,
  type DropdownMenuState,
} from '@render-experiment/dropdown-menu-core'
import { dropdownMenuAdapter } from '../adapter'

const dropdownMenuMachineWithAdapter = withAdapter<
  DropdownMenuMachineContext,
  DropdownMenuMachineProps,
  DropdownMenuEvent
>(dropdownMenuMachine, dropdownMenuAdapter)

/** Wire the core machine to React and return the connect() API. */
export function useDropdownMenuApi(props: DropdownMenuProps): DropdownMenuApi {
  // Resolve defaults ONCE here; the machine + connect receive concrete config.
  const config: DropdownMenuMachineProps = { ...DROPDOWN_MENU_DEFAULTS, ...props }
  return useApi<
    DropdownMenuMachineContext,
    DropdownMenuMachineProps,
    DropdownMenuState,
    DropdownMenuApi,
    DropdownMenuEvent
  >(dropdownMenuMachineWithAdapter, config, connectDropdownMenu)
}
