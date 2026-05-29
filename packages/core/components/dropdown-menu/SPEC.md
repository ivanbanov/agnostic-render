# DropdownMenu — spec

A button that, when activated, reveals a menu of options. Modeled after
the [Radix UI DropdownMenu] API surface and the [W3C APG Menu Button]
pattern for ARIA + keyboard semantics.

[Radix UI DropdownMenu]: https://www.radix-ui.com/primitives/docs/components/dropdown-menu
[W3C APG Menu Button]: https://www.w3.org/WAI/ARIA/apg/patterns/menubutton/

---

## Anatomy

```
dropdown-menu
├─ dropdown-menu.trigger              // the button that opens the menu
└─ dropdown-menu.content              // the menu surface
   ├─ dropdown-menu.label             // section heading (non-focusable)
   ├─ dropdown-menu.group             // grouped items with optional label
   ├─ dropdown-menu.item              // regular activatable row
   ├─ dropdown-menu.checkbox-item     // toggle row
   ├─ dropdown-menu.radio-group       // single-choice group
   │  └─ dropdown-menu.radio-item     // one option inside the group
   └─ dropdown-menu.separator         // visual + semantic divider
```

Submenus (`dropdown-menu.sub`, `dropdown-menu.sub-trigger`,
`dropdown-menu.sub-content`), arrows, and the portal layer are out of
scope for v1.

## States

- **idle** — closed; no menu visible.
- **open** — menu is mounted and one item may be highlighted.

## Behavior

### Opening

- Click the trigger → opens; first item is highlighted.
- Enter / Space on the focused trigger → opens; first item highlighted.
- Down Arrow on the focused trigger → opens; first item highlighted.
- Up Arrow on the focused trigger → opens; **last** item highlighted.
- A controlled open prop overrides all of the above.

### Closing

- Click the trigger while open → closes.
- Escape while open → closes; focus returns to the trigger.
- Tab / Shift+Tab while open → depends on `focusTrap` (see Focus trap).
  - Default (`focusTrap: false`) → closes; focus moves to the next
    tabbable element in document order, skipping the menu.
  - `focusTrap: true` → swallowed; the menu stays open and focus stays
    inside it (Esc or selecting an item exits).
- Pointer down outside the trigger and menu surface → closes.
- Activating a regular item → closes (unless the item opted out).
- Activating a checkbox or radio item → keeps the menu open.

### Item activation

- Click an item, or Enter / Space on the highlighted item, activates it.
- Activation invokes the item's `select` callback. Consumers can cancel
  the default close behavior; the menu stays open if they do.
- Disabled items: receive no activation, never highlight via pointer,
  and stay in the keyboard navigation flow (arrows pass over them
  without stopping). They participate in typeahead so a typed prefix
  can still find them, but pressing Enter does nothing.

### Highlight

- Pointer move over an item highlights it; the previously highlighted
  item un-highlights. Disabled items don't highlight.
- Arrow Down / Arrow Up moves the highlight to the next or previous
  enabled item.
- Home highlights the first enabled item. End highlights the last.
- During keyboard navigation, pointer-driven highlight is suspended
  until the pointer moves again — this prevents a mouse hovering
  silently over the menu from fighting the arrow keys.

### Typeahead

- Printable characters typed while the menu is open match items whose
  visible text starts with the buffer.
- The buffer accumulates across rapid keypresses (a quiet window
  resets it). A single matching character cycles past the current item
  to the next match; longer prefixes match the first item from the top.
- Disabled items participate. Items with no matching text are skipped.

### Mutual exclusion

Only one menu is visible at a time. Opening one closes any other.

### Focus trap

The `focusTrap` prop (default `false`) controls what Tab / Shift+Tab do
while the menu is open:

- **`false` (default)** — Tab closes the menu and lets focus move to the
  next tabbable element in document order. This is the literal
  [W3C APG menu-button] keyboard behavior ("move focus out of the menu and
  close it"). The render layer refocuses the trigger first, so the
  browser's native Tab continues from the trigger — one step past the
  dropdown.
- **`true`** — Tab is swallowed (`preventDefault`, no close); focus stays
  inside the open menu. The only ways out are Escape or activating an item.
  This matches the trapped behavior of Radix UI and React Aria, which
  contain focus inside the popover surface.

Rationale for defaulting to `false`: it is the spec-faithful behavior, and
it sidesteps the focus-proxying problem that keeps libraries that trap
(e.g. Radix's still-open issue for non-modal Tab) from letting focus leave
cleanly. `true` exists for callers who want the familiar Radix-style
containment.

This is a Tab/focus switch only — it does not make the rest of the page
inert (no scroll lock, no outside `aria-hidden`). Page modality, if needed,
is a separate concern.

### Positioning

The menu is anchored to the trigger and rendered on one of the four
sides. Authors pick a preferred side; the renderer adjusts when that
side doesn't fit. An offset along the anchor-axis controls the gap
between the trigger and the menu.

The resolved side (after any adjustment) is reported on the content so
side-specific styling can branch on it.

### Viewport visibility

The menu stays inside the viewport. When the preferred side would
clip, the renderer flips to the opposite side; when both fail, it picks
the most-visible candidate.

Position is recomputed when the trigger moves, the window resizes, or
the surrounding content scrolls. If the trigger leaves the viewport
while open, the menu dismisses.

## Accessibility

- The trigger reports that it pops up a menu and whether it's currently
  expanded; while open it points to the menu's id.
- The menu surface is announced as a menu with vertical orientation.
- Items take a menu-item role; checkbox items take a menu-item-checkbox
  role with a check state; radio items take a menu-item-radio role with
  a selected state.
- Labels carry no semantic role beyond their text; groups carry a group
  role and may reference a label by id.
- Separators carry a separator role.
- Disabled items report `aria-disabled` and remain focusable for
  navigation.

## Keyboard

**On the trigger:**

- Enter / Space → open, first item highlighted.
- Down Arrow → open, first item highlighted.
- Up Arrow → open, last item highlighted.

**Inside the menu:**

- Down Arrow → next enabled item; wraps to first at the bottom if loop
  is enabled, otherwise stops at the bottom.
- Up Arrow → previous enabled item; wraps to last at the top under the
  same loop rule.
- Home → first enabled item. End → last enabled item.
- Enter / Space → activate the highlighted item.
- Escape → close the menu; focus returns to the trigger.
- Tab / Shift+Tab → with `focusTrap: false` (default) close the menu and
  move focus to the next/previous tabbable element; with `focusTrap: true`
  the key is swallowed and the menu stays open (see Focus trap).
- Any printable character → typeahead (see above).

## Controlled vs. uncontrolled

The open state is uncontrolled by default. Authors can supply a
controlled value, in which case all internal opens and closes route
through the controller's setter. The component never mutates the
controlled value itself.

Checkbox items expose their checked state and a setter; radio groups
expose their selected value and a setter. Both follow the same
controlled/uncontrolled split.
