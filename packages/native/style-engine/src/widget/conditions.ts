import type { StyleConditionsKey, StyleConditionsMapping, StyleConditionsValue } from './types'

export const conditionsMapping: StyleConditionsMapping = {
  _disabled: 'disabled',
  _focused: 'focused',
  _pressed: 'pressed',
}

export const conditionsKeys = Object.keys(conditionsMapping) as StyleConditionsKey[]

/** Layering order — later keys override earlier ones when several are active. */
export const conditionsPriority = Object.fromEntries(
  conditionsKeys.map((key, i) => [key, i]),
) as Record<StyleConditionsKey, number>

/** Runtime flag → authored key (reverse of conditionsMapping). */
export const valueToKey = Object.fromEntries(
  conditionsKeys.map(key => [conditionsMapping[key], key]),
) as Record<StyleConditionsValue, StyleConditionsKey>
