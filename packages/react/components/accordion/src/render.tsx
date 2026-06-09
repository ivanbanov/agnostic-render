import {
  useId,
  useLayoutEffect,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { mergeProps, normalize } from '@render-experiment/machine-react'
import type { AccordionApi, AccordionProps } from '@render-experiment/accordion-core'
import { useAccordionApi } from './generated/api'
import {
  AccordionContextRef,
  AccordionItemRef,
  AccordionItemRegistryRef,
  createAccordionItemRegistry,
  useAccordionContext,
  useAccordionItem,
  useAccordionItemRegistry,
} from './context'
import * as Styled from './generated/elements'

// =============================================================================
// <Accordion> — provider, owns the machine + items registry
// =============================================================================

export interface AccordionRootProps extends Omit<AccordionProps, 'id'> {
  id?: string
  children: ReactNode
}

export function AccordionRoot(props: AccordionRootProps) {
  const { children, id: providedId, ...rest } = props
  const autoId = useId()
  const id = providedId ?? autoId

  const itemRegistry = useMemo(createAccordionItemRegistry, [])
  const baseApi = useAccordionApi({ id, ...rest })

  // Re-read items whenever the registry mutates (item mount/unmount) so header
  // navigation always resolves against the current source order. Subscribe in a
  // layout effect AND bump once on mount: items register in their own layout
  // effects (children run before this parent's), so their initial `notify()`
  // fires before we subscribe — the explicit bump re-reads the now-populated
  // registry on the first committed frame.
  const [, forceUpdate] = useState(0)
  useLayoutEffect(() => {
    forceUpdate(n => n + 1)
    return itemRegistry.subscribe(() => forceUpdate(n => n + 1))
  }, [itemRegistry])

  const api = baseApi.withItems(itemRegistry.read())

  const rootProps = normalize(api.parts.root as unknown as Record<string, unknown>)

  return (
    <AccordionContextRef.Provider value={{ api }}>
      <AccordionItemRegistryRef.Provider value={itemRegistry}>
        <Styled.Root {...rootProps} data-orientation={rest.orientation ?? 'vertical'}>
          {children}
        </Styled.Root>
      </AccordionItemRegistryRef.Provider>
    </AccordionContextRef.Provider>
  )
}

// =============================================================================
// <Accordion.Item> — registers itself, publishes its value to descendants
// =============================================================================

export interface AccordionItemComponentProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  value: string
  disabled?: boolean
  children: ReactNode
}

export function AccordionItem(props: AccordionItemComponentProps) {
  const { value, disabled, children, ...consumerProps } = props
  const { api } = useAccordionContext()
  const registry = useAccordionItemRegistry()
  const itemKey = useId()

  // Register on mount; deregister on unmount. Source order = Map insertion order.
  useLayoutEffect(
    () => registry.register({ value, disabled }, itemKey),
    [registry, value, disabled, itemKey],
  )

  const part = api.getItem({ value, disabled }).item
  const { open, disabled: itemDisabled, ...spreadable } = part
  const attrProps = normalize(spreadable as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, {
    ...attrProps,
    // DOM presentation markers derived in the view (core stays attr-name-blind).
    'data-state': open ? 'open' : 'closed',
    ...(itemDisabled ? { 'data-disabled': '' } : {}),
  })

  const itemValue = useMemo(() => ({ value, disabled: !!disabled }), [value, disabled])

  return (
    <AccordionItemRef.Provider value={itemValue}>
      <Styled.ItemRoot {...merged} open={open} disabled={itemDisabled}>
        {children}
      </Styled.ItemRoot>
    </AccordionItemRef.Provider>
  )
}

// =============================================================================
// <Accordion.Header> — the heading wrapping the trigger
// =============================================================================

export interface AccordionHeaderProps extends Omit<ComponentPropsWithoutRef<'h3'>, 'children'> {
  children: ReactNode
}

export function AccordionHeader(props: AccordionHeaderProps) {
  const { children, ...consumerProps } = props
  const { api } = useAccordionContext()
  const { value, disabled } = useAccordionItem()
  const part = api.getItem({ value, disabled }).header
  const attrProps = normalize(part as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, attrProps)
  return <Styled.Header {...merged}>{children}</Styled.Header>
}

// =============================================================================
// <Accordion.Trigger> — the activatable button
// =============================================================================

export interface AccordionTriggerProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children'
> {
  children: ReactNode
}

export function AccordionTrigger(props: AccordionTriggerProps) {
  const { children, ...consumerProps } = props
  const { api } = useAccordionContext()
  const { value, disabled } = useAccordionItem()
  const part = api.getItem({ value, disabled }).trigger

  const open = part.open
  const itemDisabled = part.disabled
  // `open` is a pure styling variant — strip it. `disabled` stays in the bag so
  // normalize() emits `aria-disabled`; it also doubles as a styling variant
  // (read from `part` for the Styled.Trigger prop below).
  const { open: _open, ...spreadable } = part
  const machineProps = normalize(spreadable as unknown as Record<string, unknown>)

  // Resolve header navigation in the view: the connect maps the key to an
  // intent + preventDefaults via `onKeyDown`; here we additionally move DOM
  // focus to the resolved trigger (focus is a substrate concern).
  const onKeyDown = (event: ReactKeyboardEvent) => {
    const orientation = (event.currentTarget.closest('[data-orientation]') as HTMLElement | null)
      ?.dataset.orientation
    const vertical = orientation !== 'horizontal'
    const intent =
      event.key === (vertical ? 'ArrowDown' : 'ArrowRight')
        ? 'next'
        : event.key === (vertical ? 'ArrowUp' : 'ArrowLeft')
          ? 'prev'
          : event.key === 'Home'
            ? 'first'
            : event.key === 'End'
              ? 'last'
              : null
    if (!intent) return
    event.preventDefault()
    const nextValue = api.navigate(value, intent)
    if (nextValue == null) return
    document.getElementById(api.triggerId(nextValue))?.focus()
  }

  const merged = mergeProps(consumerProps as Record<string, unknown>, {
    ...machineProps,
    onKeyDown,
    // DOM presentation markers derived in the view.
    'data-state': open ? 'open' : 'closed',
    ...(itemDisabled ? { 'data-disabled': '' } : {}),
  })

  return (
    <Styled.Trigger {...merged} open={open} disabled={itemDisabled}>
      {children}
      <AccordionChevron open={open} />
    </Styled.Trigger>
  )
}

/**
 * A built-in caret that rotates 180° when the section is open — the canonical
 * accordion affordance. Pure view polish (substrate-specific), so it lives in
 * the render, not the agnostic core. `aria-hidden` since the trigger already
 * announces its expanded state.
 */
function AccordionChevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden='true'
      width='14'
      height='14'
      viewBox='0 0 16 16'
      fill='none'
      style={{
        flexShrink: 0,
        transition: 'transform 180ms ease',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        color: 'currentColor',
        opacity: 0.6,
      }}
    >
      <path
        d='M4 6l4 4 4-4'
        stroke='currentColor'
        strokeWidth='1.75'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}

// =============================================================================
// <Accordion.Content> — the collapsible panel (unmounts when closed)
// =============================================================================

export interface AccordionContentProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children: ReactNode
}

export function AccordionContent(props: AccordionContentProps) {
  const { children, ...consumerProps } = props
  const { api } = useAccordionContext()
  const { value, disabled } = useAccordionItem()
  const part = api.getItem({ value, disabled }).content

  if (!part.open) return null

  // `open` is a styling variant the Styled.Content consumes (always true here
  // since we early-return when closed) — strip it from the normalize bag.
  const { open: _open, ...spreadable } = part
  const attrProps = normalize(spreadable as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, {
    ...attrProps,
    'data-state': 'open',
  })

  return (
    <Styled.Content {...(merged as Record<string, unknown>)} open>
      {children}
    </Styled.Content>
  )
}

// re-exported aliases for the compound api in index.ts
export type { AccordionApi }
