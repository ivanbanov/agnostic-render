/* eslint-disable */
import { useMachine, useEffects } from '@render-experiment/machine-native'
import {
  DIALOG_DEFAULTS,
  connectDialog,
  dialogMachineConfig,
  type DialogApi,
  type DialogMachineProps,
  type DialogProps,
} from '@render-experiment/dialog-core'
import { dialogEffects } from '../effects'

/** Wire the core dialog machine to native and return the connect() API. */
export function useDialogApi(props: DialogProps): DialogApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const dialogProps: DialogMachineProps = { ...DIALOG_DEFAULTS, ...props }
  const { api, machine } = useMachine(dialogMachineConfig, connectDialog, dialogProps)
  // Substrate-specific transport declared as a ComponentEffect; useEffects owns
  // the React effect + builds its dep array.
  useEffects(machine, dialogEffects, dialogProps)
  return api
}
