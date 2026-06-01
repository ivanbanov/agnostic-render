/* eslint-disable */
import { withAdapter } from '@render-experiment/machine-core'
import { useApi } from '@render-experiment/machine-react'
import {
  connectDropdownMenu,
  dropdownMenuMachine,
  type DropdownMenuApi,
  type DropdownMenuContext as DropdownMenuMachineContext,
  type DropdownMenuEvent,
  type DropdownMenuProps,
  type DropdownMenuState,
} from '@render-experiment/dropdown-menu-core'
import { dropdownMenuAdapter } from '../adapter'

const dropdownMenuMachineWithAdapter = withAdapter<
  DropdownMenuMachineContext,
  DropdownMenuProps,
  DropdownMenuEvent
>(dropdownMenuMachine, dropdownMenuAdapter)

/** Wire the core machine to React and return the connect() API. */
export function useDropdownMenuApi(props: DropdownMenuProps): DropdownMenuApi {
  return useApi<
    DropdownMenuMachineContext,
    DropdownMenuProps,
    DropdownMenuState,
    DropdownMenuApi,
    DropdownMenuEvent
  >(dropdownMenuMachineWithAdapter, props, connectDropdownMenu)
}
