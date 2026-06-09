import { useMemo, type ReactNode } from 'react'
import { Text, type PressableProps, type TextStyle, type ViewProps } from 'react-native'
import { normalize } from '@render-experiment/machine-native'
import type { AccordionProps } from '@render-experiment/accordion-core'
import { useAccordionApi } from './generated/api'
import {
  AccordionContextRef,
  AccordionItemRef,
  useAccordionContext,
  useAccordionItem,
} from './context'
import * as Styled from './generated/elements'

// The styled Trigger is a Pressable (View-like); RN Text doesn't inherit color
// from a parent View, so the trigger label + chevron carry these explicitly.
// Mirror the shared trigger palette (open → indigo accent, disabled → muted).
const TRIGGER_TEXT = '#1c1e26'
const TRIGGER_TEXT_OPEN = '#4658e0'
const TRIGGER_TEXT_DISABLED = '#aab0c0'

// =============================================================================
// <Accordion> — root provider
// =============================================================================

export interface AccordionRootProps extends Omit<AccordionProps, 'id'> {
  id?: string
  children: ReactNode
}

export function AccordionRoot(props: AccordionRootProps) {
  const { children, id, ...rest } = props
  const resolvedId = id ?? 'accordion'
  const api = useAccordionApi({ id: resolvedId, ...rest })
  return (
    <AccordionContextRef.Provider value={{ api }}>
      <Styled.Root>{children}</Styled.Root>
    </AccordionContextRef.Provider>
  )
}

// =============================================================================
// <Accordion.Item>
// =============================================================================

export interface AccordionItemComponentProps extends ViewProps {
  value: string
  disabled?: boolean
  children: ReactNode
}

export function AccordionItem(props: AccordionItemComponentProps) {
  const { value, disabled, children, ...consumerProps } = props
  const { api } = useAccordionContext()
  const part = api.getItem({ value, disabled }).item

  const itemValue = useMemo(() => ({ value, disabled: !!disabled }), [value, disabled])

  return (
    <AccordionItemRef.Provider value={itemValue}>
      <Styled.ItemRoot {...consumerProps} open={part.open} disabled={part.disabled}>
        {children}
      </Styled.ItemRoot>
    </AccordionItemRef.Provider>
  )
}

// =============================================================================
// <Accordion.Header>
// =============================================================================

export interface AccordionHeaderProps extends ViewProps {
  children: ReactNode
}

export function AccordionHeader(props: AccordionHeaderProps) {
  const { children, ...consumerProps } = props
  return <Styled.Header {...consumerProps}>{children}</Styled.Header>
}

// =============================================================================
// <Accordion.Trigger> — Pressable that toggles the panel
// =============================================================================

export interface AccordionTriggerProps extends Omit<PressableProps, 'children'> {
  children: ReactNode
}

export function AccordionTrigger(props: AccordionTriggerProps) {
  const { children, ...consumerProps } = props
  const { api } = useAccordionContext()
  const { value, disabled } = useAccordionItem()
  const part = api.getItem({ value, disabled }).trigger

  // `open` / `disabled` are styling variants the Styled.Trigger consumes — strip
  // them before normalize(); `disabled` also feeds accessibilityState, so keep a
  // copy in the logical bag for that.
  const { open, ...spreadable } = part
  // normalize() maps onPress→onPress, role→accessibilityRole, and folds
  // expanded/disabled into accessibilityState; controls/hasPopup are dropped.
  const machineProps = normalize(spreadable as unknown as Record<string, unknown>)

  const textColor = part.disabled ? TRIGGER_TEXT_DISABLED : open ? TRIGGER_TEXT_OPEN : TRIGGER_TEXT
  const labelStyle: TextStyle = { color: textColor, fontSize: 15, fontWeight: '600' }

  // Wrap a bare string in Text so the label paints (RN won't style raw strings);
  // a consumer-provided <Text> is left alone. The chevron mirrors the web caret.
  const label = typeof children === 'string' ? <Text style={labelStyle}>{children}</Text> : children

  return (
    <Styled.Trigger
      {...consumerProps}
      {...(machineProps as PressableProps)}
      disabled={part.disabled}
      open={open}
    >
      {label}
      <AccordionChevron open={open} color={textColor} />
    </Styled.Trigger>
  )
}

/**
 * A caret that flips when the section opens — the RN analog of the web build's
 * rotating chevron. RN has no inline SVG by default, so we draw it as a Text
 * glyph and toggle the character (▾ open / ▸ closed). `accessibilityElementsHidden`
 * keeps it out of the a11y tree since the trigger already announces expanded.
 */
function AccordionChevron({ open, color }: { open: boolean; color: string }) {
  return (
    <Text
      accessibilityElementsHidden
      importantForAccessibility='no'
      style={{ color, fontSize: 12, opacity: 0.6, marginLeft: 8 }}
    >
      {open ? '▾' : '▸'}
    </Text>
  )
}

// =============================================================================
// <Accordion.Content> — unmounts when closed
// =============================================================================

export interface AccordionContentProps extends ViewProps {
  children: ReactNode
}

export function AccordionContent(props: AccordionContentProps) {
  const { children, ...consumerProps } = props
  const { api } = useAccordionContext()
  const { value, disabled } = useAccordionItem()
  const part = api.getItem({ value, disabled }).content

  if (!part.open) return null

  // The styled Content is a View; a bare string child won't paint, so wrap it in
  // Text carrying the shared muted body color. A consumer <Text> is left alone.
  const body =
    typeof children === 'string' ? (
      <Text style={{ color: '#5b6172', fontSize: 14, lineHeight: 21 }}>{children}</Text>
    ) : (
      children
    )

  return (
    <Styled.Content {...consumerProps} open>
      {body}
    </Styled.Content>
  )
}
