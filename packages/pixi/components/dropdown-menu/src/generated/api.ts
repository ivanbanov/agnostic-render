/* eslint-disable */
import { withAdapter } from '@render-experiment/machine-core'
import { createRuntime, type Runtime } from '@render-experiment/machine-pixi'
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

/**
 * Pixi version: not a hook (no React). Returns a runtime + a getApi()
 * that's cached by the machine's version counter — calls are cheap as
 * long as nothing has changed.
 */
export type DropdownMenuBridge = Runtime<
  DropdownMenuMachineContext,
  DropdownMenuProps,
  DropdownMenuApi,
  DropdownMenuEvent
>

export function createDropdownMenuBridge(props: DropdownMenuProps): DropdownMenuBridge {
  return createRuntime<
    DropdownMenuMachineContext,
    DropdownMenuProps,
    DropdownMenuState,
    DropdownMenuApi,
    DropdownMenuEvent
  >(dropdownMenuMachineWithAdapter, props, connectDropdownMenu)
}
