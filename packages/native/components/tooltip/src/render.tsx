/**
 * RN Tooltip view.
 *
 * Differences from the web tooltip worth flagging:
 *
 * - **Long-press, not hover.** RN has no hover model. The trigger opens
 *   on long-press (~500ms by default; configurable via TooltipProps).
 *   This also means "skip-delay window" doesn't apply the same way on
 *   touch — it stays in the machine but never fires.
 *
 * - **Inline absolute overlay.** Content renders inline with
 *   `position: absolute` in window-space. Works fine for most layouts;
 *   deeply clipped contexts (ScrollView, FlatList) would need a Modal
 *   or portal — TooltipProvider exists for that but the v1 view
 *   doesn't use it yet.
 *
 * - **Anchor via measureInWindow.** RN's measure callback is async, so
 *   we compute the anchor once when the tooltip opens and re-measure
 *   on next layout. Window resize would require a Dimensions listener
 *   (omitted for the v1 — covers 90% of real use).
 *
 * - **No escape-key listener.** Closing happens on outside tap or
 *   pressOut. The Android back button could be wired up — see
 *   the BackHandler note in trackEscapeKey below.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  BackHandler,
  Pressable,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { normalize } from "@render-experiment/machine-native";
import {
  placementToSide,
  tooltipProps as resolveProps,
  type ResolvedTooltipProps,
  type TooltipApi,
  type TooltipProps,
} from "@render-experiment/tooltip-core";
import { useTooltipApi } from "./api";
import { resolveContent, resolvePositioner } from "./elements";

// -----------------------------------------------------------------------------
// Internal context — Trigger and Content read api + triggerRef + anchor
// -----------------------------------------------------------------------------

interface TooltipCtxValue {
  api: TooltipApi;
  props: ResolvedTooltipProps;
  triggerRef: React.MutableRefObject<View | null>;
  anchor: { x: number; y: number; width: number; height: number } | null;
  setAnchor: (a: { x: number; y: number; width: number; height: number } | null) => void;
  id: string;
}

const TooltipCtx = createContext<TooltipCtxValue | null>(null);

function useTooltipCtxOrThrow() {
  const ctx = useContext(TooltipCtx);
  if (!ctx) {
    throw new Error("Tooltip.Trigger / Tooltip.Content must be inside <Tooltip>");
  }
  return ctx;
}

// -----------------------------------------------------------------------------
// <Tooltip> — root provider
// -----------------------------------------------------------------------------

export interface TooltipRootProps extends Omit<TooltipProps, "id"> {
  id?: string;
  children: ReactNode;
}

export function TooltipRoot(props: TooltipRootProps) {
  const { children, id: providedId, ...rest } = props;
  const autoId = useId();
  const id = providedId ?? autoId;

  const triggerRef = useRef<View | null>(null);
  const [anchor, setAnchor] = useState<TooltipCtxValue["anchor"]>(null);
  const rawProps: TooltipProps = { id, ...rest };
  const api = useTooltipApi(rawProps);
  const resolved = resolveProps(rawProps);

  return (
    <TooltipCtx.Provider value={{ api, props: resolved, triggerRef, anchor, setAnchor, id }}>
      {children}
    </TooltipCtx.Provider>
  );
}

// -----------------------------------------------------------------------------
// <Tooltip.Trigger> — wraps the user's child in a Pressable with long-press
// -----------------------------------------------------------------------------

export interface TooltipTriggerProps {
  children: ReactNode;
  /** Long-press duration in ms. Defaults to 500. */
  delayLongPress?: number;
}

export function TooltipTrigger({
  children,
  delayLongPress = 500,
}: TooltipTriggerProps) {
  const { api, triggerRef, setAnchor } = useTooltipCtxOrThrow();

  // Measure on layout so the anchor is current when the tooltip opens.
  // Re-measure when content is rendered (api.content.rendered toggles).
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

  // Map the API's logical handlers to RN's gesture vocabulary. Tooltip's
  // logical surface emits onPress/onPointerDown/onPointerLeave; the
  // normalizer drops the pointer-leave on RN. We supplement with
  // onLongPress to actually open.
  const normalized = normalize(
    api.trigger.handlers as unknown as Record<string, unknown>,
  );

  return (
    <Pressable
      ref={triggerRef as unknown as React.Ref<View>}
      onLayout={onLayout}
      onLongPress={() => {
        measure();
        api.setOpen(true);
      }}
      onPressOut={() => {
        // Close on release. Removes the need for a tap-outside listener
        // for the common case; keep-open-while-held is the standard touch idiom.
        api.setOpen(false);
      }}
      delayLongPress={delayLongPress}
      {...(normalized as object)}
    >
      {children}
    </Pressable>
  );
}

// -----------------------------------------------------------------------------
// <Tooltip.Content> — renders into the portal slot or inline
// -----------------------------------------------------------------------------

export interface TooltipContentProps {
  children: ReactNode;
}

export function TooltipContent({ children }: TooltipContentProps) {
  const { api, props, anchor } = useTooltipCtxOrThrow();

  const rendered = api.content.rendered;
  const side = placementToSide(api.content.positioning.placement);

  // Wire Android back button to close (mirror of trackEscapeKey on web).
  useEffect(() => {
    if (!rendered) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      api.setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [rendered, api]);

  if (!rendered) return null;

  const positionerStyle = resolvePositioner({ anchored: anchor ? "true" : "false" });
  const contentStyle = resolveContent({ side, red: props.red ? "true" : "false" });

  // Convert anchor center → absolute coords for the positioner. Mirrors
  // the web `anchorOf` math but simplified to placement="bottom" — full
  // placement support could be added by porting utils.ts.
  const positionedStyle = anchor
    ? {
        ...positionerStyle,
        left: anchor.x + anchor.width / 2,
        top: anchor.y + anchor.height,
      }
    : positionerStyle;

  // Inline rendering. The tooltip is absolutely positioned in window-space
  // (positioner has `position: absolute` from styles.ts), so it overlays
  // whatever's around it without needing a portal in most layouts.
  // For deeply-clipped scenarios (ScrollView, FlatList) a Modal-based
  // overlay would be needed — out of scope for v1.
  return (
    <View style={positionedStyle} pointerEvents="box-none">
      <View style={[contentStyle, anchorContentTransform(side)]} pointerEvents="auto">
        {typeof children === "string" ? (
          <Text style={{ color: (contentStyle.color as string) ?? "#fff", fontSize: contentStyle.fontSize as number }}>
            {children}
          </Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

// Equivalent of RN's edge-pinning trick: shift the content so the pinned
// edge sits on the anchor point.
function anchorContentTransform(
  side: ReturnType<typeof placementToSide>,
): { transform?: Array<{ translateX?: number; translateY?: number }> } {
  switch (side) {
    case "top":
      return { transform: [{ translateY: -8 }, { translateX: -50 }] };
    case "bottom":
      return { transform: [{ translateY: 8 }, { translateX: -50 }] };
    case "left":
      return { transform: [{ translateX: -8 }, { translateY: -50 }] };
    case "right":
      return { transform: [{ translateX: 8 }, { translateY: -50 }] };
  }
}

// -----------------------------------------------------------------------------
// Composite
// -----------------------------------------------------------------------------

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
});
