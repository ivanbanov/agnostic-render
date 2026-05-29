import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefObject,
} from "react";
import { mergeProps, normalize } from "@render-experiment/machine-react";
import {
  tooltipProps as resolveProps,
  type ResolvedTooltipProps,
  type TooltipApi,
  type TooltipProps,
} from "@render-experiment/tooltip-core";
import { useTooltipApi } from "./generated/api";
import { TooltipContextRef, useTooltipContext } from "./context";
import * as Styled from "./generated/elements";
import { anchorOf, cloneOnly, getChildRef, mergeRefs } from "./utils";

// -----------------------------------------------------------------------------
// <Tooltip> — provider, owns the machine
// -----------------------------------------------------------------------------

export interface TooltipRootProps extends Omit<TooltipProps, "id"> {
  id?: string;
  children: ReactNode;
}

export function TooltipRoot(props: TooltipRootProps) {
  const { children, id: providedId, ...rest } = props;
  const autoId = useId();
  const id = providedId ?? autoId;

  const triggerRef = useRef<HTMLElement | null>(null);
  const rawProps: TooltipProps = { id, ...rest };
  const api = useTooltipApi(rawProps);
  const resolved = resolveProps(rawProps);

  return (
    <TooltipContextRef.Provider value={{ api, props: resolved, triggerRef }}>
      {children}
    </TooltipContextRef.Provider>
  );
}

// -----------------------------------------------------------------------------
// <Tooltip.Trigger> — clones child, captures its element via callback ref
// -----------------------------------------------------------------------------
//
// Consumer-passed props on <Tooltip.Trigger> (data-*, aria-*, className,
// onClick, etc.) are merged onto the cloned child. Machine-supplied
// handlers and attrs (onPointerMove, aria-describedby, ...) take
// precedence when both sides set the same key; for event handlers,
// both fire via mergeProps.

export interface TooltipTriggerProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  children: ReactNode;
}

export function TooltipTrigger(props: TooltipTriggerProps) {
  const { children, ...consumerProps } = props;
  const { api, triggerRef } = useTooltipContext();

  const setRef = (node: HTMLElement | null) => {
    triggerRef.current = node;
  };

  const machineProps = {
    ...normalize(api.trigger.handlers as unknown as Record<string, unknown>),
    ...normalize(api.trigger.attrs as unknown as Record<string, unknown>),
  };

  const merged = mergeProps(
    consumerProps as Record<string, unknown>,
    machineProps,
  );

  const triggerProps = {
    ...merged,
    ref: mergeRefs(setRef, getChildRef(children)),
  };
  return cloneOnly(children, triggerProps);
}

// -----------------------------------------------------------------------------
// <Tooltip.Content>
// -----------------------------------------------------------------------------
//
// Render structure:
//   <Styled.Positioner>  position: fixed at anchor point (zero-size,
//                         from spec); top/left are runtime data and
//                         come through the `css` prop.
//     <Styled.Content>   position: absolute + edge-pinned via variant
//   </Styled.Positioner>
//
// Consumer-passed props (className, style, data-testid, onMouseEnter,
// etc.) are merged onto <Styled.Content>. Variants come through as
// named props (`side`, `red`); they aren't spread from `props`.

export interface TooltipContentProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  children: ReactNode;
}

export function TooltipContent(props: TooltipContentProps) {
  const { children, ...consumerProps } = props;
  const { api, props: ctxProps, triggerRef } = useTooltipContext();
  if (!api.content.rendered) return null;
  return (
    <PositionedContent
      api={api}
      ctxProps={ctxProps}
      consumerProps={consumerProps}
      triggerRef={triggerRef}
    >
      {children}
    </PositionedContent>
  );
}

function PositionedContent({
  api,
  ctxProps,
  consumerProps,
  triggerRef,
  children,
}: {
  api: TooltipApi;
  ctxProps: ResolvedTooltipProps;
  consumerProps: Record<string, unknown>;
  triggerRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      setAnchor(anchorOf(trigger.getBoundingClientRect(), api.content.positioning));
    };
    measure();
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [api.content.positioning, triggerRef]);

  const handlerProps = normalize(api.content.handlers as unknown as Record<string, unknown>);
  const attrProps = normalize(api.content.attrs as unknown as Record<string, unknown>);

  // Two runtime numbers — that's the irreducible minimum. Everything else
  // is variants on the styled element.
  const anchorCoords = anchor ? { top: anchor.y, left: anchor.x } : undefined;

  // Compose consumer props with machine handlers/attrs. Machine wins on
  // non-handler conflicts; both handlers fire when both sides have them.
  const merged = mergeProps(consumerProps, { ...handlerProps, ...attrProps });

  // ctxProps is read for parity with native/pixi adapters that still
  // need ResolvedTooltipProps; here `red` flows through api.content.variants.
  void ctxProps;

  return (
    <Styled.Positioner anchored={anchor ? "true" : "false"} css={anchorCoords}>
      <Styled.Content {...merged} {...api.content.variants}>
        {children}
      </Styled.Content>
    </Styled.Positioner>
  );
}

// -----------------------------------------------------------------------------
// Public composite
// -----------------------------------------------------------------------------

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
});
