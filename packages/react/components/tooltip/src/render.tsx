import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { normalize } from "@render-experiment/machine-react";
import {
  placementToSide,
  type TooltipApi,
  type TooltipProps,
} from "@render-experiment/tooltip-core";
import { useTooltipApi } from "./api";
import { TooltipContextRef, useTooltipContext } from "./context";
import * as Styled from "./elements";
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
  const api = useTooltipApi({ id, ...rest });

  return (
    <TooltipContextRef.Provider value={{ api, triggerRef }}>{children}</TooltipContextRef.Provider>
  );
}

// -----------------------------------------------------------------------------
// <Tooltip.Trigger> — clones child, captures its element via callback ref
// -----------------------------------------------------------------------------

export interface TooltipTriggerProps {
  children: ReactNode;
}

export function TooltipTrigger({ children }: TooltipTriggerProps) {
  const { api, triggerRef } = useTooltipContext();

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
// The positioner is a zero-size box at the anchor point so the content's
// edge-pinning variant (`top/right/bottom/left: "100%"`) resolves against
// the anchor rather than the viewport.

export interface TooltipContentProps {
  children: ReactNode;
}

export function TooltipContent({ children }: TooltipContentProps) {
  const { api, triggerRef } = useTooltipContext();
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
  api: TooltipApi;
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
  const side = placementToSide(api.content.positioning.placement);

  // Two runtime numbers — that's the irreducible minimum. Everything else
  // is variants on the styled element.
  const anchorCoords = anchor ? { top: anchor.y, left: anchor.x } : undefined;

  return (
    <Styled.Positioner anchored={anchor ? "true" : "false"} css={anchorCoords}>
      <Styled.Content {...handlerProps} {...attrProps} side={side}>
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
