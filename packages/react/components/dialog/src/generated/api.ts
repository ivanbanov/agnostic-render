/* eslint-disable */
import { useMachine } from '@render-experiment/machine-react'
import {
  DIALOG_DEFAULTS,
  connectDialog,
  dialogMachineConfig,
  type DialogApi,
  type DialogMachineProps,
  type DialogProps,
} from '@render-experiment/dialog-core'
import { dialogEffects } from '../effects'

/** Wire the core dialog machine to React and return the connect() API. */
export function useDialogApi(props: DialogProps): DialogApi {
  // Resolve defaults once (machine + connector operate on the concrete shape).
  const dialogProps: DialogMachineProps = { ...DIALOG_DEFAULTS, ...props }
  // useMachine runs the component's prop-dependent effects (Escape, back-button)
  // internally — one useEffect each, keyed on their named prop deps.
  const { api } = useMachine(dialogMachineConfig, connectDialog, dialogEffects, dialogProps)
  return api
}
