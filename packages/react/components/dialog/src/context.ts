import { createContext, useContext, type RefObject } from 'react'
import type { DialogApi, DialogMachineProps } from '@render-experiment/dialog-core'

export interface DialogContextValue {
  api: DialogApi
  props: DialogMachineProps
  /** The element that opened the dialog — focus returns here on close. */
  triggerRef: RefObject<HTMLElement | null>
  /** The dialog content surface — focus trap + initial focus target. */
  contentRef: RefObject<HTMLElement | null>
}

export const DialogContextRef = createContext<DialogContextValue | null>(null)

export function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContextRef)
  if (!ctx) {
    throw new Error('Dialog.Trigger / Dialog.Content / … must be used inside <Dialog>')
  }
  return ctx
}
