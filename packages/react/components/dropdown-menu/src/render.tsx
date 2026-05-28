import {
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { normalize } from "@render-experiment/machine-react";
import {
  placementToSide,
  type DropdownMenuApi,
  type DropdownMenuProps,
  type MenuItemProps,
} from "@render-experiment/dropdown-menu-core";
import { useDropdownMenuApi } from "./api";
import {
  CurrentApiRef,
  DropdownMenuContextRef,
  ItemCheckedRef,
  ItemRegistryRef,
  RadioGroupContextRef,
  createItemRegistry,
  useCurrentApi,
  useDropdownMenuContext,
  useItemRegistry,
  useRadioGroup,
  type RadioGroupValue,
} from "./context";
import * as Styled from "./elements";
import { anchorOf, cloneOnly, getChildRef, mergeRefs } from "./utils";

// =============================================================================
// <DropdownMenu> — provider, owns the machine + items registry
// =============================================================================

export interface DropdownMenuRootProps extends Omit<DropdownMenuProps, "id"> {
  id?: string;
  children: ReactNode;
}

export function DropdownMenuRoot(props: DropdownMenuRootProps) {
  const { children, id: providedId, ...rest } = props;
  const autoId = useId();
  const id = providedId ?? autoId;

  const triggerRef = useRef<HTMLElement | null>(null);
  const itemRegistry = useMemo(createItemRegistry, []);
  const api = useDropdownMenuApi({ id, ...rest });

  return (
    <DropdownMenuContextRef.Provider value={{ api, triggerRef }}>
      <ItemRegistryRef.Provider value={itemRegistry}>
        {children}
      </ItemRegistryRef.Provider>
    </DropdownMenuContextRef.Provider>
  );
}

// =============================================================================
// <DropdownMenu.Trigger>
// =============================================================================

export interface DropdownMenuTriggerProps {
  children: ReactNode;
}

export function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { api, triggerRef } = useDropdownMenuContext();
  const setRef = (node: HTMLElement | null) => {
    triggerRef.current = node;
  };

  const triggerProps = {
    ...normalize(api.trigger.handlers as unknown as Record<string, unknown>),
    ...normalize(api.trigger.attrs as unknown as Record<string, unknown>),
    ref: mergeRefs(setRef, getChildRef(children)),
  };
  return cloneOnly(children, triggerProps);
}

// =============================================================================
// <DropdownMenu.Content>
// =============================================================================

export interface DropdownMenuContentProps {
  children: ReactNode;
}

export function DropdownMenuContent({ children }: DropdownMenuContentProps) {
  const { api, triggerRef } = useDropdownMenuContext();
  if (!api.content.rendered) return null;
  return (
    <PositionedContent api={api} triggerRef={triggerRef}>
      {children}
    </PositionedContent>
  );
}

function PositionedContent({
  api,
  triggerRef,
  children,
}: {
  api: DropdownMenuApi;
  triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const registry = useItemRegistry();
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Re-read items whenever the registry mutates (item mount/unmount).
  const [, forceUpdate] = useState(0);
  useEffect(
    () => registry.subscribe(() => forceUpdate((n) => n + 1)),
    [registry],
  );

  // Anchor position from the trigger's rect — same approach as tooltip.
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setAnchor(
        anchorOf(trigger.getBoundingClientRect(), api.content.positioning),
      );
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [api.content.positioning, triggerRef]);

  // Focus the content on open so keyboard handlers attach to it.
  useLayoutEffect(() => {
    contentRef.current?.focus();
  }, []);

  // Outside-click closes. We close on any pointerdown outside both the
  // trigger and the content. Lives here (not in core) because it needs to
  // know which DOM elements count as "inside."
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      api.setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [api, triggerRef]);

  const items = registry.read();
  const apiWithItems = api.withItems(items);

  const handlerProps = normalize(
    apiWithItems.content.handlers as unknown as Record<string, unknown>,
  );
  const attrProps = normalize(
    apiWithItems.content.attrs as unknown as Record<string, unknown>,
  );
  const side = placementToSide(apiWithItems.content.positioning.placement);
  const anchorCoords = anchor ? { top: anchor.y, left: anchor.x } : undefined;

  return (
    <Styled.Positioner anchored={anchor ? "true" : "false"} css={anchorCoords}>
      <Styled.Content
        {...handlerProps}
        {...attrProps}
        side={side}
        ref={contentRef}
      >
        <CurrentApiRef.Provider value={apiWithItems}>
          {children}
        </CurrentApiRef.Provider>
      </Styled.Content>
    </Styled.Positioner>
  );
}

// =============================================================================
// Item base — used by Item / CheckboxItem / RadioItem
// =============================================================================

interface ItemBaseProps {
  value: string;
  textValue?: string;
  disabled?: boolean;
  onSelect?: () => void;
  kind: "item" | "checkbox" | "radio";
  checked?: boolean | "indeterminate";
  children: ReactNode;
}

function ItemBase({
  value,
  textValue,
  disabled,
  onSelect,
  kind,
  checked,
  children,
}: ItemBaseProps) {
  const api = useCurrentApi();
  const registry = useItemRegistry();
  const itemKey = useId();

  // Register on mount; deregister on unmount. The registry order matches
  // mount order, which for stable sibling lists matches source order.
  useLayoutEffect(() => {
    return registry.register(
      { value, textValue, disabled, kind, checked, onSelect },
      itemKey,
    );
  }, [registry, value, textValue, disabled, kind, checked, onSelect, itemKey]);

  const part = api.getItem({
    value,
    textValue,
    disabled,
    kind,
    checked,
    onSelect,
  });
  const handlerProps = normalize(
    part.handlers as unknown as Record<string, unknown>,
  );
  const attrProps = normalize(part.attrs as unknown as Record<string, unknown>);

  return (
    <Styled.Item
      {...handlerProps}
      {...attrProps}
      highlighted={part.highlighted ? "true" : "false"}
      disabled={disabled ? "true" : "false"}
    >
      <ItemCheckedRef.Provider value={checked ?? false}>
        {children}
      </ItemCheckedRef.Provider>
    </Styled.Item>
  );
}

// =============================================================================
// <DropdownMenu.Item>
// =============================================================================

export interface DropdownMenuItemProps {
  value: string;
  textValue?: string;
  disabled?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}

export function DropdownMenuItem(props: DropdownMenuItemProps) {
  return <ItemBase {...props} kind="item" />;
}

// =============================================================================
// <DropdownMenu.CheckboxItem> + ItemIndicator
// =============================================================================

export interface DropdownMenuCheckboxItemProps extends DropdownMenuItemProps {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
}

export function DropdownMenuCheckboxItem(props: DropdownMenuCheckboxItemProps) {
  const { checked, onCheckedChange, onSelect, ...rest } = props;
  const handleSelect = () => {
    onSelect?.();
    onCheckedChange?.(!checked);
  };
  return (
    <ItemBase
      {...rest}
      kind="checkbox"
      checked={checked}
      onSelect={handleSelect}
    />
  );
}

// =============================================================================
// <DropdownMenu.RadioGroup> + RadioItem
// =============================================================================

export interface DropdownMenuRadioGroupProps {
  value?: string;
  onValueChange?: (next: string) => void;
  children: ReactNode;
}

export function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
}: DropdownMenuRadioGroupProps) {
  const ctxValue = useMemo<RadioGroupValue>(
    () => ({ value, onValueChange: onValueChange ?? (() => undefined) }),
    [value, onValueChange],
  );
  return (
    <RadioGroupContextRef.Provider value={ctxValue}>
      {children}
    </RadioGroupContextRef.Provider>
  );
}

export interface DropdownMenuRadioItemProps {
  value: string;
  textValue?: string;
  disabled?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}

export function DropdownMenuRadioItem(props: DropdownMenuRadioItemProps) {
  const radioGroup = useRadioGroup();
  const checked = radioGroup?.value === props.value;
  const handleSelect = () => {
    props.onSelect?.();
    radioGroup?.onValueChange(props.value);
  };
  return (
    <ItemBase
      {...props}
      kind="radio"
      checked={checked}
      onSelect={handleSelect}
    />
  );
}

// =============================================================================
// <DropdownMenu.ItemIndicator>
// =============================================================================

export interface DropdownMenuItemIndicatorProps {
  children?: ReactNode;
}

export function DropdownMenuItemIndicator({
  children,
}: DropdownMenuItemIndicatorProps) {
  const checked = useContext(ItemCheckedRef);
  if (!checked) return null;
  return <span style={{ marginRight: 6 }}>{children ?? "✓"}</span>;
}

// =============================================================================
// Trivial parts: Separator, Label, Group
// =============================================================================

export function DropdownMenuSeparator() {
  const { api } = useDropdownMenuContext();
  const attrProps = normalize(
    api.separator.attrs as unknown as Record<string, unknown>,
  );
  return <Styled.Separator {...attrProps} />;
}

export interface DropdownMenuLabelProps {
  children: ReactNode;
}

export function DropdownMenuLabel({ children }: DropdownMenuLabelProps) {
  const { api } = useDropdownMenuContext();
  const attrProps = normalize(
    api.label.attrs as unknown as Record<string, unknown>,
  );
  return <Styled.Label {...attrProps}>{children}</Styled.Label>;
}

export interface DropdownMenuGroupProps {
  children: ReactNode;
}

export function DropdownMenuGroup({ children }: DropdownMenuGroupProps) {
  const { api } = useDropdownMenuContext();
  const attrProps = normalize(
    api.group.attrs as unknown as Record<string, unknown>,
  );
  return <Styled.Group {...attrProps}>{children}</Styled.Group>;
}
