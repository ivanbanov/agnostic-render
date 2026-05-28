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
} from "react";
import {
  BackHandler,
  Dimensions,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
  type TextStyle,
} from "react-native";
import { normalize } from "@render-experiment/machine-native";
import {
  placementToSide,
  type DropdownMenuProps,
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
  useItemChecked,
  useItemRegistry,
  useRadioGroup,
  type RadioGroupValue,
} from "./context";
import {
  resolveContent,
  resolveGroup,
  resolveItem,
  resolveLabel,
  resolvePositioner,
  resolveSeparator,
} from "./elements";

// =============================================================================
// <DropdownMenu> — root provider
// =============================================================================

export interface DropdownMenuRootProps extends Omit<DropdownMenuProps, "id"> {
  id?: string;
  children: ReactNode;
}

export function DropdownMenuRoot(props: DropdownMenuRootProps) {
  const { children, id: providedId, ...rest } = props;
  const autoId = useId();
  const id = providedId ?? autoId;

  const triggerRef = useRef<View | null>(null);
  const [anchor, setAnchor] =
    useState<DropdownMenuRootContextAnchor>(null);
  const itemRegistry = useMemo(createItemRegistry, []);
  const api = useDropdownMenuApi({ id, ...rest });

  return (
    <DropdownMenuContextRef.Provider
      value={{ api, triggerRef, anchor, setAnchor }}
    >
      <ItemRegistryRef.Provider value={itemRegistry}>
        {children}
      </ItemRegistryRef.Provider>
    </DropdownMenuContextRef.Provider>
  );
}

type DropdownMenuRootContextAnchor =
  | { x: number; y: number; width: number; height: number }
  | null;

// =============================================================================
// <DropdownMenu.Trigger>
// =============================================================================

export interface DropdownMenuTriggerProps {
  children: ReactNode;
}

export function DropdownMenuTrigger({ children }: DropdownMenuTriggerProps) {
  const { api, triggerRef, setAnchor } = useDropdownMenuContext();

  const measure = useCallback(() => {
    const node = triggerRef.current;
    if (!node) return;
    node.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
    });
  }, [setAnchor, triggerRef]);

  const onLayout = useCallback(
    (_: LayoutChangeEvent) => {
      measure();
    },
    [measure],
  );

  const normalized = normalize(
    api.trigger.handlers as unknown as Record<string, unknown>,
  );

  return (
    <Pressable
      ref={triggerRef as unknown as React.Ref<View>}
      onLayout={onLayout}
      onPress={() => {
        measure();
        api.setOpen(!api.open);
      }}
      {...(normalized as object)}
    >
      {children}
    </Pressable>
  );
}

// =============================================================================
// <DropdownMenu.Content>
// =============================================================================

export interface DropdownMenuContentProps {
  children: ReactNode;
}

export function DropdownMenuContent({ children }: DropdownMenuContentProps) {
  const { api, anchor, triggerRef } = useDropdownMenuContext();
  void triggerRef;

  const registry = useItemRegistry();
  const rendered = api.content.rendered;
  const side = placementToSide(api.content.positioning.placement);

  // Subscribe to registry mutations so items show up after first paint.
  const [, forceUpdate] = useState(0);
  useEffect(
    () => registry.subscribe(() => forceUpdate((n) => n + 1)),
    [registry],
  );

  // Android back closes the menu.
  useEffect(() => {
    if (!rendered) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      api.setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [rendered, api]);

  if (!rendered) return null;

  const items = registry.read();
  const apiWithItems = api.withItems(items);

  const positionerStyle = resolvePositioner({
    anchored: anchor ? "true" : "false",
  });
  const contentStyle = resolveContent({ side });
  const positionedStyle = anchor
    ? {
        ...positionerStyle,
        left: anchor.x,
        top: anchor.y + anchor.height + apiWithItems.content.positioning.offset.main,
      }
    : positionerStyle;

  // Full-screen invisible backdrop to catch tap-outside. RN has no
  // document-level pointer listener.
  const { width: screenW, height: screenH } = Dimensions.get("window");

  return (
    <>
      <Pressable
        onPress={() => api.setOpen(false)}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: screenW,
          height: screenH,
        }}
        accessible={false}
      />
      <View style={positionedStyle} pointerEvents="box-none">
        <View style={contentStyle} pointerEvents="auto">
          <CurrentApiRef.Provider value={apiWithItems}>
            {children}
          </CurrentApiRef.Provider>
        </View>
      </View>
    </>
  );
}

// =============================================================================
// Item base
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
  const handlers = normalize(
    part.handlers as unknown as Record<string, unknown>,
  );

  const itemStyle = resolveItem({
    highlighted: part.highlighted ? "true" : "false",
    disabled: disabled ? "true" : "false",
  });

  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        (handlers as { onPress?: () => void }).onPress?.();
      }}
      disabled={disabled}
      style={itemStyle}
    >
      <ItemCheckedRef.Provider value={checked ?? false}>
        {renderTextSafe(children, {
          color: (itemStyle.color as string) ?? "#fff",
        })}
      </ItemCheckedRef.Provider>
    </Pressable>
  );
}

// =============================================================================
// Parts
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

export interface DropdownMenuItemIndicatorProps {
  children?: ReactNode;
}

export function DropdownMenuItemIndicator({
  children,
}: DropdownMenuItemIndicatorProps) {
  const checked = useItemChecked();
  if (!checked) return null;
  return (
    <Text style={{ marginRight: 6, color: "#fff" }}>
      {typeof children === "string" || typeof children === "number"
        ? children
        : (children ?? "✓")}
    </Text>
  );
}

export function DropdownMenuSeparator() {
  const style = resolveSeparator({});
  return <View style={style} />;
}

export interface DropdownMenuLabelProps {
  children: ReactNode;
}

export function DropdownMenuLabel({ children }: DropdownMenuLabelProps) {
  const style = resolveLabel({});
  return (
    <Text style={{ ...(style as object), color: (style.color as string) ?? "#9ca3af" }}>
      {children}
    </Text>
  );
}

export interface DropdownMenuGroupProps {
  children: ReactNode;
}

export function DropdownMenuGroup({ children }: DropdownMenuGroupProps) {
  const style = resolveGroup({});
  return <View style={style}>{children}</View>;
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
    if (typeof child === "string" || typeof child === "number") {
      return (
        <Text key={`t-${i}`} style={textStyle}>
          {child}
        </Text>
      );
    }
    return <Fragment key={`f-${i}`}>{child}</Fragment>;
  });
}

