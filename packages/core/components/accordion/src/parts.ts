export const parts = ['root', 'itemRoot', 'header', 'trigger', 'content'] as const
export type Part = (typeof parts)[number]

export type AccordionItemRootVariants = {
  open: boolean
  disabled: boolean
}

export type AccordionTriggerVariants = {
  open: boolean
  disabled: boolean
}

export type AccordionContentVariants = {
  open: boolean
}
