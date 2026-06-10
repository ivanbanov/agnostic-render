/**
 * Accordion defaults.
 *
 * Resolution is a plain object spread — `{ ...ACCORDION_DEFAULTS, ...props }`
 * applied ONCE at the target entry (generated api.ts). Every prop is flat, so
 * a shallow spread fully resolves them; there is no merge function.
 *
 * Kept separate from machine.ts so a designer collaborator can read the
 * defaults in isolation, without scrolling past the state machine.
 */

import type { AccordionOrientation, AccordionType } from './types'

export const ACCORDION_DEFAULTS = {
  type: 'single' as AccordionType,
  collapsible: false,
  defaultValue: [] as string[],
  disabled: false,
  loop: true,
  orientation: 'vertical' as AccordionOrientation,
  dir: 'ltr' as const,
} as const
