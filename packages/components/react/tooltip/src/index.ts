import {
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
} from "./render";

export const Tooltip = Object.assign(TooltipRoot, {
  Trigger: TooltipTrigger,
  Content: TooltipContent,
});

export type {
  TooltipContentProps,
  TooltipRootProps,
  TooltipTriggerProps,
} from "./render";
