import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { mergeProps, normalize } from '@render-experiment/machine-react'
import { pickSide, type Side } from '@render-experiment/utils'
import {
  type DropdownMenuApi,
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
  useDropdownMenuItemRegistry,
  useDropdownMenuRadioGroup,
  type DropdownMenuRadioGroupValue,
} from './context'
import * as Styled from './generated/elements'
import { anchorOf, cloneOnly, getChildRef, mainOffsetFor, mergeRefs } from './utils'

// =============================================================================
// <DropdownMenu> — provider, owns the machine + items registry
// =============================================================================

export interface DropdownMenuRootProps extends Omit<DropdownMenuProps, 'id'> {
  id?: string
  children: ReactNode
}

export function DropdownMenuRoot(props: DropdownMenuRootProps) {
  const { children, id: providedId, ...rest } = props
  const autoId = useId()
  const id = providedId ?? autoId

  const triggerRef = useRef<HTMLElement | null>(null)
  const itemRegistry = useMemo(createDropdownMenuItemRegistry, [])
  const api = useDropdownMenuApi({ id, ...rest })

  return (
    <DropdownMenuContextRef.Provider value={{ api, triggerRef }}>
      <DropdownMenuItemRegistryRef.Provider value={itemRegistry}>
        {children}
      </DropdownMenuItemRegistryRef.Provider>
    </DropdownMenuContextRef.Provider>
  )
}

// =============================================================================
// <DropdownMenu.Trigger>
// =============================================================================

export interface DropdownMenuTriggerProps extends Omit<
  ComponentPropsWithoutRef<'button'>,
  'children'
> {
  children: ReactNode
}

export function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  const { children, ...consumerProps } = props
  const { api, triggerRef } = useDropdownMenuContext()
  const setRef = (node: HTMLElement | null) => {
    triggerRef.current = node
  }

  const machineProps = {
    ...normalize(api.parts.trigger.handlers as unknown as Record<string, unknown>),
    ...normalize(api.parts.trigger.attrs as unknown as Record<string, unknown>),
  }

  const merged = mergeProps(consumerProps as Record<string, unknown>, machineProps)

  const triggerProps = {
    ...merged,
    ref: mergeRefs(setRef, getChildRef(children)),
  }
  return cloneOnly(children, triggerProps)
}

// =============================================================================
// <DropdownMenu.Content>
// =============================================================================

export interface DropdownMenuContentProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children'
> {
  children: ReactNode
}

export function DropdownMenuContent(props: DropdownMenuContentProps) {
  const { children, ...consumerProps } = props
  const { api, triggerRef } = useDropdownMenuContext()
  if (!api.parts.content.rendered) return null
  return (
    <PositionedContent api={api} triggerRef={triggerRef} consumerProps={consumerProps}>
      {children}
    </PositionedContent>
  )
}

function PositionedContent({
  api,
  triggerRef,
  consumerProps,
  children,
}: {
  api: DropdownMenuApi
  triggerRef: RefObject<HTMLElement | null>
  consumerProps: Record<string, unknown>
  children: ReactNode
}) {
  const registry = useDropdownMenuItemRegistry()
  const contentRef = useRef<HTMLDivElement | null>(null)

  // Re-read items whenever the registry mutates (item mount/unmount).
  const [, forceUpdate] = useState(0)
  useEffect(() => registry.subscribe(() => forceUpdate(n => n + 1)), [registry])

  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null)
  const [effectiveSide, setEffectiveSide] = useState<Side>(api.parts.content.variants.side)

  // Measure: read both rects, compute the effective side (collision
  // flip), then anchor against the effective placement so the offsets
  // come out right. Same flow as tooltip.
  useLayoutEffect(() => {
    const measure = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const triggerRect = trigger.getBoundingClientRect()
      const contentRect = contentRef.current?.getBoundingClientRect() ?? null

      const preferred = api.parts.content.variants.side
      const { placement, offsetX, offsetY } = api.parts.content
      const next = pickSide(
        preferred,
        triggerRect,
        contentRect,
        { width: window.innerWidth, height: window.innerHeight },
        mainOffsetFor(placement, offsetX, offsetY),
      )
      setEffectiveSide(next)

      const flippedPlacement = next === preferred ? placement : (next as typeof placement)
      setAnchor(anchorOf(triggerRect, flippedPlacement, offsetX, offsetY))
    }
    measure()
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure, true)
      window.removeEventListener('resize', measure)
    }
  }, [
    api.parts.content.placement,
    api.parts.content.offsetX,
    api.parts.content.offsetY,
    api.parts.content.variants.side,
    triggerRef,
  ])

  // Trigger-move detection: ResizeObserver catches box changes that
  // don't trigger window scroll/resize.
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return
    const trigger = triggerRef.current
    if (!trigger) return
    const ro = new ResizeObserver(() => {
      const t = triggerRef.current
      if (!t) return
      const triggerRect = t.getBoundingClientRect()
      const contentRect = contentRef.current?.getBoundingClientRect() ?? null
      const preferred = api.parts.content.variants.side
      const { placement, offsetX, offsetY } = api.parts.content
      const next = pickSide(
        preferred,
        triggerRect,
        contentRect,
        { width: window.innerWidth, height: window.innerHeight },
        mainOffsetFor(placement, offsetX, offsetY),
      )
      setEffectiveSide(next)
      const flippedPlacement = next === preferred ? placement : (next as typeof placement)
      setAnchor(anchorOf(triggerRect, flippedPlacement, offsetX, offsetY))
    })
    ro.observe(trigger)
    return () => ro.disconnect()
  }, [
    api.parts.content.placement,
    api.parts.content.offsetX,
    api.parts.content.offsetY,
    api.parts.content.variants.side,
    triggerRef,
  ])

  // Viewport dismiss: close when the trigger scrolls out of view.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const trigger = triggerRef.current
    if (!trigger) return
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) {
          api.setOpen(false)
        }
      }
    })
    io.observe(trigger)
    return () => io.disconnect()
  }, [api, triggerRef])

  // Focus the content as soon as it is visible (anchor measured →
  // visibility flips to visible). visibility:hidden elements can't
  // receive focus, so focusing on mount alone silently no-ops and
  // leaves keystrokes routed to the trigger.
  const didFocusRef = useRef(false)
  useLayoutEffect(() => {
    if (anchor && !didFocusRef.current) {
      contentRef.current?.focus()
      didFocusRef.current = true
    }
  }, [anchor])

  // On Tab in loose mode, restore focus to the trigger before the machine's
  // keydown handler closes the menu. After unmount the browser's native Tab
  // navigation continues from the trigger, so the user's next focusable is
  // one Tab past the dropdown — matching the SPEC's "Tab leaves the menu"
  // behavior. In focus-trap mode the core swallows Tab and the menu stays
  // open, so we must NOT pull focus to the trigger — leave it on the menu.
  const onContentKeyDownCapture = (event: ReactKeyboardEvent) => {
    if (event.key === 'Tab' && !api.focusTrap) {
      triggerRef.current?.focus()
    }
  }

  // Outside-click closes.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (triggerRef.current?.contains(target)) return
      if (contentRef.current?.contains(target)) return
      api.setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [api, triggerRef])

  const items = registry.read()
  const apiWithItems = api.withItems(items)

  const handlerProps = normalize(
    apiWithItems.parts.content.handlers as unknown as Record<string, unknown>,
  )
  const attrProps = normalize(
    apiWithItems.parts.content.attrs as unknown as Record<string, unknown>,
  )
  const anchorCoords = anchor ? { top: anchor.y, left: anchor.x } : undefined

  const merged = mergeProps(consumerProps, {
    ...handlerProps,
    ...attrProps,
    'data-side': effectiveSide,
    onKeyDownCapture: onContentKeyDownCapture,
  })

  return (
    <Styled.Positioner anchored={!!anchor} css={anchorCoords}>
      <Styled.Content
        {...merged}
        {...apiWithItems.parts.content.variants}
        side={effectiveSide}
        ref={contentRef}
      >
        <DropdownMenuCurrentApiRef.Provider value={apiWithItems}>
          {children}
        </DropdownMenuCurrentApiRef.Provider>
      </Styled.Content>
    </Styled.Positioner>
  )
}

// =============================================================================
// Item base — used by Item / CheckboxItem / RadioItem
// =============================================================================

interface ItemBaseProps {
  value: string
  textValue?: string
  disabled?: boolean
  onSelect?: (event: DropdownMenuSelectEvent) => void
  kind: 'item' | 'checkbox' | 'radio'
  checked?: boolean | 'indeterminate'
  children: ReactNode
  /** Arbitrary HTML attrs the consumer passed to <Item/CheckboxItem/RadioItem>. */
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

  // Register on mount; deregister on unmount.
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
  const handlerProps = normalize(part.handlers as unknown as Record<string, unknown>)
  const attrProps = normalize(part.attrs as unknown as Record<string, unknown>)
  const machineProps = { ...handlerProps, ...attrProps }
  const merged = mergeProps(consumerProps, machineProps)

  return (
    <Styled.Item {...merged} {...part.variants}>
      <DropdownMenuItemCheckedRef.Provider value={checked ?? false}>
        {children}
      </DropdownMenuItemCheckedRef.Provider>
    </Styled.Item>
  )
}

// =============================================================================
// <DropdownMenu.Item>
// =============================================================================

export interface DropdownMenuItemProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onSelect'
> {
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

// =============================================================================
// <DropdownMenu.CheckboxItem> + ItemIndicator
// =============================================================================

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

// =============================================================================
// <DropdownMenu.RadioGroup> + RadioItem
// =============================================================================

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

export interface DropdownMenuRadioItemProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onSelect'
> {
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

// =============================================================================
// <DropdownMenu.ItemIndicator>
// =============================================================================

export interface DropdownMenuItemIndicatorProps {
  children?: ReactNode
}

export function DropdownMenuItemIndicator({ children }: DropdownMenuItemIndicatorProps) {
  const checked = useContext(DropdownMenuItemCheckedRef)
  if (!checked) return null
  return <span style={{ marginRight: 6 }}>{children ?? '✓'}</span>
}

// =============================================================================
// Trivial parts: Separator, Label, Group
// =============================================================================

export type DropdownMenuSeparatorProps = ComponentPropsWithoutRef<'div'>

export function DropdownMenuSeparator(props: DropdownMenuSeparatorProps) {
  const { api } = useDropdownMenuContext()
  const attrProps = normalize(api.parts.separator.attrs as unknown as Record<string, unknown>)
  const merged = mergeProps(props as Record<string, unknown>, attrProps)
  return <Styled.Separator {...merged} />
}

export interface DropdownMenuLabelProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children: ReactNode
}

export function DropdownMenuLabel(props: DropdownMenuLabelProps) {
  const { children, ...consumerProps } = props
  const { api } = useDropdownMenuContext()
  const attrProps = normalize(api.parts.label.attrs as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, attrProps)
  return <Styled.Label {...merged}>{children}</Styled.Label>
}

export interface DropdownMenuGroupProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  children: ReactNode
}

export function DropdownMenuGroup(props: DropdownMenuGroupProps) {
  const { children, ...consumerProps } = props
  const { api } = useDropdownMenuContext()
  const attrProps = normalize(api.parts.group.attrs as unknown as Record<string, unknown>)
  const merged = mergeProps(consumerProps as Record<string, unknown>, attrProps)
  return <Styled.Group {...merged}>{children}</Styled.Group>
}
