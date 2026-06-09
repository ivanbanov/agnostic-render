import { createContext, useContext, type MutableRefObject } from 'react'
import type { View } from 'react-native'
import type { DialogApi, DialogMachineProps } from '@render-experiment/dialog-core'

export interface DialogContextValue {
  api: DialogApi
  props: DialogMachineProps
  triggerRef: MutableRefObject<View | null>
}

export const DialogContextRef = createContext<DialogContextValue | null>(null)

export function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContextRef)
  if (!ctx) {
    throw new Error('Dialog.Trigger / Dialog.Content / … must be used inside <Dialog>')
  }
  return ctx
}
