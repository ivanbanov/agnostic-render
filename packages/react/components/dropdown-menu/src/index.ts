import {
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuRoot,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./render";

/**
 * Compound API mirroring Radix's DropdownMenu surface.
 *
 *   <DropdownMenu>
 *     <DropdownMenu.Trigger><button>Menu</button></DropdownMenu.Trigger>
 *     <DropdownMenu.Content>
 *       <DropdownMenu.Label>Actions</DropdownMenu.Label>
 *       <DropdownMenu.Item value="a">Action</DropdownMenu.Item>
 *       <DropdownMenu.Separator/>
 *       <DropdownMenu.CheckboxItem value="b" checked onCheckedChange={...}>
 *         <DropdownMenu.ItemIndicator/> Toggle
 *       </DropdownMenu.CheckboxItem>
 *       <DropdownMenu.RadioGroup value="x" onValueChange={...}>
 *         <DropdownMenu.RadioItem value="x">X</DropdownMenu.RadioItem>
 *         <DropdownMenu.RadioItem value="y">Y</DropdownMenu.RadioItem>
 *       </DropdownMenu.RadioGroup>
 *     </DropdownMenu.Content>
 *   </DropdownMenu>
 *
 * Not (yet) in this build: Portal, Sub*, Arrow.
 */
export const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Trigger: DropdownMenuTrigger,
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  CheckboxItem: DropdownMenuCheckboxItem,
  RadioGroup: DropdownMenuRadioGroup,
  RadioItem: DropdownMenuRadioItem,
  ItemIndicator: DropdownMenuItemIndicator,
  Separator: DropdownMenuSeparator,
  Label: DropdownMenuLabel,
  Group: DropdownMenuGroup,
});

export * from "./render";
export * from "./generated/api";
export * from "./context";
