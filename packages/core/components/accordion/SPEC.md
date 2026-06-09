# Accordion — spec

A vertically (or horizontally) stacked set of headers, each revealing a
collapsible panel of content. Modeled after the [Radix UI Accordion] API
surface and the [W3C APG Accordion] pattern for ARIA + keyboard semantics.

[Radix UI Accordion]: https://www.radix-ui.com/primitives/docs/components/accordion
[W3C APG Accordion]: https://www.w3.org/WAI/ARIA/apg/patterns/accordion/

---

## Anatomy

```
accordion
└─ accordion.item                     // one collapsible section, keyed by value
   ├─ accordion.header                // the heading that labels the section
   │  └─ accordion.trigger            // the button that toggles the panel
   └─ accordion.content               // the collapsible panel
```

Animation primitives (measured height transitions) are out of scope for
v1 — closed panels simply unmount.

## States

The accordion has no top-level open/closed mode. Disclosure is per item:
the component tracks the **set of open item values**. Zero, one, or many
items may be open depending on the mode.

## Behavior

### Expansion mode

- **single** (default) — at most one item is open at a time. Opening an
  item closes the previously open one.
- **multiple** — any number of items may be open independently; each
  trigger toggles its own panel.

### Collapsible (single mode only)

- **`collapsible: false`** (default) — once an item is open, clicking its
  own trigger does not close it; the only way to close it is to open a
  different item. At least one item stays open.
- **`collapsible: true`** — clicking the open item's trigger closes it,
  so the accordion can reach a state where nothing is open.

In **multiple** mode every trigger always toggles, so `collapsible` has no
effect.

### Toggling

- Click a trigger, or Enter / Space on the focused trigger, toggles that
  item per the mode + collapsible rules above.
- A disabled item (or a fully disabled accordion) never toggles and never
  receives activation.

### Header navigation

Headers form a roving group the user moves through with the keyboard:

- Down Arrow (vertical) / Right Arrow (horizontal) → focus the next
  enabled trigger.
- Up Arrow (vertical) / Left Arrow (horizontal) → focus the previous
  enabled trigger.
- Home → focus the first enabled trigger. End → focus the last.
- Disabled triggers are skipped during navigation.
- With `loop` enabled (default), navigation wraps around at the
  boundaries; otherwise it stops at the first/last enabled trigger.
- Navigation moves focus only — it never opens or closes a panel.

The navigation axis follows `orientation` (default vertical). `dir`
(`ltr` / `rtl`) is accepted for Radix-API parity.

### Disabled

- A disabled **item** has an inert trigger: it doesn't toggle, doesn't
  take keyboard focus, and is skipped by header navigation.
- A disabled **accordion** disables every item the same way.

## Accessibility

- Each header is a heading element wrapping its trigger.
- The trigger reports whether its panel is currently expanded and points
  to the panel it controls.
- The panel is announced as a region labelled by its trigger; while
  closed it is hidden from assistive tech (and unmounted).
- Disabled triggers report `aria-disabled` and drop out of the focus
  order.

## Keyboard

- Enter / Space → toggle the focused item's panel.
- Down / Up (vertical) or Right / Left (horizontal) → move focus to the
  next / previous enabled trigger (wraps if `loop`).
- Home → first enabled trigger. End → last enabled trigger.

## Controlled vs. uncontrolled

The open set is uncontrolled by default, seeded from `defaultValue`.
Authors can supply a controlled `value`, in which case all internal
opens and closes route through `onValueChange`; the component never
mutates the controlled value itself. In single mode the open set holds
at most one value, even when seeded with more.
