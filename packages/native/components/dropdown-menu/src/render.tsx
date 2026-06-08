/**
 * RN DropdownMenu view.
 *
 * Touch model differences from the web build worth flagging:
 *
 * - **Tap to open, tap to close** — no hover; the trigger is a Pressable
 *   whose onPress calls api.setOpen toggled. Mirrors what users expect
 *   from mobile menus.
 *
 * - **No keyboard nav** — RN doesn't have a focusable menu surface in the
 *   sense the W3C menu-button pattern assumes. We omit ArrowDown/Up/Home/End/
 *   typeahead handlers; items are tapped directly. The machine still
 *   supports them — only the view doesn't wire them.
 *
 * - **Inline overlay** — Content renders absolutely in window-space,
 *   relative to the measured trigger rect. No portal yet.
 *
 * - **Android back button** maps to escape/close, mirroring trackEscapeKey
 *   on the web side.
 *
 * - **Tap-outside** to close — implemented as a full-screen invisible
 *   backdrop while open. RN has no document-level pointer listener;
 *   the backdrop catches anything tapped outside the content.
 */
import {
  Children,
  Fragment,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  Dimensions,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type PressableProps,
  type TextStyle,
  type ViewProps,
} from 'react-native'
import { mergeProps, normalize } from '@render-experiment/machine-native'
import {
  type DropdownMenuProps,
  type DropdownMenuSelectEvent,
} from '@render-experiment/dropdown-menu-core'
import { useDropdownMenuApi } from './generated/api'
import {
  DropdownMenuCurrentApiRef,
  DropdownMenuContextRef,
  DropdownMenuItemCheckedRef,
  DropdownMenuItemRegistryRef,
  DropdownMenuRadioGroupContextRef,
  createDropdownMenuItemRegistry,
  useDropdownMenuCurrentApi,
  useDropdownMenuContext,
  useDropdownMenuItemChecked,
  useDropdownMenuItemRegistry,
  useDropdownMenuRadioGroup,
  type DropdownMenuRadioGroupValue,
} from './context'
import * as Styled from './generated/elements'

// Painted text presentation — the styled parts are Views; RN Text doesn't
// inherit color from a parent View, so text labels carry these explicitly.
// (Mirror the shared item/label colors.)
const ITEM_TEXT = '#222428'
const ITEM_TEXT_HIGHLIGHTED = '#314CD9'
const ITEM_TEXT_DISABLED = '#AEB2C0'
const LABEL_TEXT = '#AEB2C0'

// =============================================================================
// <DropdownMenu> — root provider
// =============================================================================

export interface DropdownMenuRootProps extends Omit<DropdownMenuProps, 'id'> {
  id?: string
  children: ReactNode
}

export function DropdownMenuRoot(props: DropdownMenuRootProps) {
  const { children, id: providedId, ...rest } = props
  const autoId = useId()
  const id = providedId ?? autoId

  const triggerRef = useRef<View | null>(null)
  const [anchor, setAnchor] = useState<DropdownMenuRootContextAnchor>(null)
  const itemRegistry = useMemo(createDropdownMenuItemRegistry, [])
  const api = useDropdownMenuApi({ id, ...rest })

  return (
    <DropdownMenuContextRef.Provider value={{ api, triggerRef, anchor, setAnchor }}>
      <DropdownMenuItemRegistryRef.Provider value={itemRegistry}>
        {children}
      </DropdownMenuItemRegistryRef.Provider>
    </DropdownMenuContextRef.Provider>
  )
}

type DropdownMenuRootContextAnchor = { x: number; y: number; width: number; height: number } | null

// =============================================================================
// <DropdownMenu.Trigger>
// =============================================================================

export interface DropdownMenuTriggerProps extends Omit<PressableProps, 'children'> {
  children: ReactNode
}

export function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  const { children, ...consumerProps } = props
  const { api, triggerRef, setAnchor } = useDropdownMenuContext()

  const measure = useCallback(() => {
    const node = triggerRef.current
    if (!node) return
    node.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
    })
  }, [setAnchor, triggerRef])

  const onLayout = useCallback(
    (_: LayoutChangeEvent) => {
      measure()
    },
    [measure],
  )

  const normalized = normalize(api.parts.trigger as unknown as Record<string, unknown>)

  const machineProps: Record<string, unknown> = {
    ...(normalized as object),
    onLayout,
    onPress: () => {
      measure()
      api.setOpen(!api.open)
    },
  }

  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)

  return (
    <Pressable ref={triggerRef as unknown as React.Ref<View>} {...(merged as PressableProps)}>
      {children}
    </Pressable>
  )
}

// =============================================================================
// <DropdownMenu.Content>
// =============================================================================

export interface DropdownMenuContentProps extends Omit<ViewProps, 'children'> {
  children: ReactNode
}

export function DropdownMenuContent(props: DropdownMenuContentProps) {
  const { children, ...consumerProps } = props
  const { api, anchor, triggerRef } = useDropdownMenuContext()
  void triggerRef

  const registry = useDropdownMenuItemRegistry()
  const rendered = api.open

  // Subscribe to registry mutations so items show up after first paint.
  const [, forceUpdate] = useState(0)
  useEffect(() => registry.subscribe(() => forceUpdate(n => n + 1)), [registry])

  // The Android back button is wired in effects.ts (a ComponentEffect the
  // generated useDropdownMenuApi runs via useEffects) — mirror of the web
  // Escape listener — so it isn't re-implemented here.

  if (!rendered) return null

  const items = registry.read()
  const apiWithItems = api.withItems(items)

  // Runtime anchor coords layer onto the styled Positioner (base position:absolute).
  const positionedStyle = anchor
    ? {
        left: anchor.x,
        top: anchor.y + anchor.height + apiWithItems.parts.content.offsetY,
      }
    : undefined

  // Full-screen invisible backdrop to catch tap-outside. RN has no
  // document-level pointer listener.
  const { width: screenW, height: screenH } = Dimensions.get('window')

  const merged = mergeProps(consumerProps as Record<string, unknown>, {
    side: apiWithItems.parts.content.side,
    pointerEvents: 'auto',
  })

  return (
    <>
      <Pressable
        onPress={() => api.setOpen(false)}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: screenW,
          height: screenH,
        }}
        accessible={false}
      />
      <Styled.Positioner style={positionedStyle} pointerEvents='box-none'>
        <Styled.Content {...merged}>
          <DropdownMenuCurrentApiRef.Provider value={apiWithItems}>
            {children}
          </DropdownMenuCurrentApiRef.Provider>
        </Styled.Content>
      </Styled.Positioner>
    </>
  )
}

// =============================================================================
// Item base
// =============================================================================

interface ItemBaseProps {
  value: string
  textValue?: string
  disabled?: boolean
  onSelect?: (event: DropdownMenuSelectEvent) => void
  kind: 'item' | 'checkbox' | 'radio'
  checked?: boolean | 'indeterminate'
  children: ReactNode
  consumerProps?: Record<string, unknown>
}

function ItemBase({
  value,
  textValue,
  disabled,
  onSelect,
  kind,
  checked,
  children,
  consumerProps,
}: ItemBaseProps) {
  const api = useDropdownMenuCurrentApi()
  const registry = useDropdownMenuItemRegistry()
  const itemKey = useId()

  useLayoutEffect(
    () => registry.register({ value, textValue, disabled, kind, checked, onSelect }, itemKey),
    [registry, value, textValue, disabled, kind, checked, onSelect, itemKey],
  )

  const part = api.getItem({
    value,
    textValue,
    disabled,
    kind,
    checked,
    onSelect,
  })
  const handlers = normalize(part as unknown as Record<string, unknown>)

  // `highlighted` / `disabled` are styling variants on the styled Item
  // (a Pressable); the resolved text color follows the same state.
  const textColor = part.disabled
    ? ITEM_TEXT_DISABLED
    : part.highlighted
      ? ITEM_TEXT_HIGHLIGHTED
      : ITEM_TEXT

  const merged = mergeProps(consumerProps, {
    onPress: () => {
      if (disabled) return
      ;(handlers as { onPress?: () => void }).onPress?.()
    },
    disabled,
    highlighted: part.highlighted,
  })

  return (
    <Styled.Item {...merged}>
      <DropdownMenuItemCheckedRef.Provider value={checked ?? false}>
        {renderTextSafe(children, { color: textColor })}
      </DropdownMenuItemCheckedRef.Provider>
    </Styled.Item>
  )
}

// =============================================================================
// Parts
// =============================================================================

export interface DropdownMenuItemProps extends Omit<PressableProps, 'children' | 'onPress'> {
  value: string
  textValue?: string
  disabled?: boolean
  onSelect?: (event: DropdownMenuSelectEvent) => void
  children: ReactNode
}

export function DropdownMenuItem(props: DropdownMenuItemProps) {
  const { value, textValue, disabled, onSelect, children, ...consumerProps } = props
  return (
    <ItemBase
      value={value}
      textValue={textValue}
      disabled={disabled}
      onSelect={onSelect}
      kind='item'
      consumerProps={consumerProps as Record<string, unknown>}
    >
      {children}
    </ItemBase>
  )
}

export interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  checked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean) => void
}

export function DropdownMenuCheckboxItem(props: DropdownMenuCheckboxItemProps) {
  const {
    checked,
    onCheckedChange,
    onSelect,
    value,
    textValue,
    disabled,
    children,
    ...consumerProps
  } = props
  const handleSelect = (event: DropdownMenuSelectEvent) => {
    onSelect?.(event)
    if (event.defaultPrevented) return
    onCheckedChange?.(!checked)
  }
  return (
    <ItemBase
      value={value}
      textValue={textValue}
      disabled={disabled}
      onSelect={handleSelect}
      kind='checkbox'
      checked={checked}
      consumerProps={consumerProps as Record<string, unknown>}
    >
      {children}
    </ItemBase>
  )
}

export interface DropdownMenuRadioGroupProps {
  value?: string
  onValueChange?: (next: string) => void
  children: ReactNode
}

export function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: DropdownMenuRadioGroupProps) {
  const ctxValue = useMemo<DropdownMenuRadioGroupValue>(
    () => ({ value, onValueChange: onValueChange ?? (() => undefined) }),
    [value, onValueChange],
  )
  return (
    <DropdownMenuRadioGroupContextRef.Provider value={ctxValue}>
      {children}
    </DropdownMenuRadioGroupContextRef.Provider>
  )
}

export interface DropdownMenuRadioItemProps extends Omit<PressableProps, 'children' | 'onPress'> {
  value: string
  textValue?: string
  disabled?: boolean
  onSelect?: (event: DropdownMenuSelectEvent) => void
  children: ReactNode
}

export function DropdownMenuRadioItem(props: DropdownMenuRadioItemProps) {
  const { value, textValue, disabled, onSelect, children, ...consumerProps } = props
  const radioGroup = useDropdownMenuRadioGroup()
  const checked = radioGroup?.value === value
  const handleSelect = (event: DropdownMenuSelectEvent) => {
    onSelect?.(event)
    if (event.defaultPrevented) return
    radioGroup?.onValueChange(value)
  }
  return (
    <ItemBase
      value={value}
      textValue={textValue}
      disabled={disabled}
      onSelect={handleSelect}
      kind='radio'
      checked={checked}
      consumerProps={consumerProps as Record<string, unknown>}
    >
      {children}
    </ItemBase>
  )
}

export interface DropdownMenuItemIndicatorProps {
  children?: ReactNode
}

export function DropdownMenuItemIndicator({ children }: DropdownMenuItemIndicatorProps) {
  const checked = useDropdownMenuItemChecked()
  if (!checked) return null
  return (
    <Text style={{ marginRight: 6, color: '#fff' }}>
      {typeof children === 'string' || typeof children === 'number' ? children : (children ?? '✓')}
    </Text>
  )
}

export type DropdownMenuSeparatorProps = ViewProps

export function DropdownMenuSeparator(props: DropdownMenuSeparatorProps) {
  return <Styled.Separator {...(props as Record<string, unknown>)} />
}

export interface DropdownMenuLabelProps extends Omit<ViewProps, 'children'> {
  children: ReactNode
}

export function DropdownMenuLabel(props: DropdownMenuLabelProps) {
  const { children, ...consumerProps } = props
  return (
    <Styled.Label {...(consumerProps as Record<string, unknown>)}>
      <Text style={{ color: LABEL_TEXT }}>{children}</Text>
    </Styled.Label>
  )
}

export interface DropdownMenuGroupProps extends Omit<ViewProps, 'children'> {
  children: ReactNode
}

export function DropdownMenuGroup(props: DropdownMenuGroupProps) {
  const { children, ...consumerProps } = props
  return <Styled.Group {...(consumerProps as Record<string, unknown>)}>{children}</Styled.Group>
}

// =============================================================================
// renderTextSafe — wrap stray string/number children in <Text>
// =============================================================================
//
// RN throws "Text strings must be rendered within a <Text> component" when
// a bare string lands inside a non-Text element. Item-like parts accept
// children that mix elements (e.g. <ItemIndicator/>) with literal text
// ("Show URLs"). We walk the children once and wrap any raw string/number
// in a <Text>, leaving elements alone.

function renderTextSafe(children: ReactNode, textStyle?: TextStyle): ReactNode {
  return Children.map(children, (child, i) => {
    if (typeof child === 'string' || typeof child === 'number') {
      return (
        <Text key={`t-${i}`} style={textStyle}>
          {child}
        </Text>
      )
    }
    return <Fragment key={`f-${i}`}>{child}</Fragment>
  })
}
