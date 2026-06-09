/* eslint-disable */
import { useMachine } from '@render-experiment/machine-react'
import {
  DROPDOWN_MENU_DEFAULTS,
  connectDropdownMenu,
  dropdownMenuMachineConfig,
  type DropdownMenuApi,
  type DropdownMenuMachineProps,
  type DropdownMenuProps,
} from '@render-experiment/dropdown-menu-core'
import { dropdownMenuEffects } from '../effects'

/** Wire the core dropdownMenu machine to React and return the connect() API. */
export function useDropdownMenuApi(props: DropdownMenuProps): DropdownMenuApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const dropdownMenuProps: DropdownMenuMachineProps = { ...DROPDOWN_MENU_DEFAULTS, ...props }
  // useMachine runs the component's prop-dependent effects (Escape, back-button)
  // internally — one useEffect each, keyed on their named prop deps.
  const { api } = useMachine(
    dropdownMenuMachineConfig,
    connectDropdownMenu,
    dropdownMenuEffects,
    dropdownMenuProps,
  )
  return api
}
