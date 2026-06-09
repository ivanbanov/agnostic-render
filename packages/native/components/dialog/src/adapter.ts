import type { Adapter } from '@render-experiment/machine-core'
import type { DialogComputed, DialogContext, DialogEvent } from '@render-experiment/dialog-core'

// No machine effects to override on RN. The Android back button (the RN analog
// of web Escape) is a prop-dependent listener, so it lives in effects.ts as a
// ComponentEffect; outside-pointer-down is handled on the Overlay in render.tsx.
// Left empty intentionally.
export const dialogAdapter: Adapter<DialogContext, DialogEvent, DialogComputed> = {}
