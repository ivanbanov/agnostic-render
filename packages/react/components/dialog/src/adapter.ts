import type { Adapter } from '@render-experiment/machine-core'
import type { DialogComputed, DialogContext, DialogEvent } from '@render-experiment/dialog-core'

// No machine effects to override on web. The prop-dependent listeners (Escape,
// focus trap) live in effects.ts as ComponentEffects the generated useApi runs
// via useEffects; outside-pointer-down is handled on the overlay in render.tsx.
// Left empty intentionally.
export const dialogAdapter: Adapter<DialogContext, DialogEvent, DialogComputed> = {}
