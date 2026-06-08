/**
 * Dialog parts — anatomy + variant types.
 *
 * Names: `parts` (ordered list of the painted parts the component renders). The
 * trigger isn't here — it's the consumer's own element (cloned), with no styled
 * wrapper. The paint lives in @render-experiment/dialog-shared; each styled part
 * exported there must have a matching `<Part>Variants` type below.
 */

export const parts = ['overlay', 'content', 'title', 'description', 'close'] as const
export type Part = (typeof parts)[number]

export type DialogOverlayVariants = {
  open: boolean
}

export type DialogContentVariants = {
  open: boolean
}
