/**
 * Dialog — public barrel.
 *
 * Every internal name is prefix-scoped (dialogMachineConfig, DialogProps,
 * connectDialog, …), so the barrel re-exports each module with `export *`
 * without fear of collisions.
 */

export * from './types'
export * from './props'
export * from './machine'
export * from './connect'
export * from './utils'
export * from './parts'
export * as styles from '@render-experiment/dialog-shared'
export type { Style, StyleSpec, StyleValue } from '@render-experiment/style-engine-core'
