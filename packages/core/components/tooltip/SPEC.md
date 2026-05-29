# Tooltip — spec

A short, transient surface that describes a trigger element. Always informational,
never interactive. Modeled after the [Radix UI Tooltip] API surface and the
[W3C APG Tooltip pattern] for ARIA + keyboard semantics.

[Radix UI Tooltip]: https://www.radix-ui.com/primitives/docs/components/tooltip
[W3C APG Tooltip pattern]: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/

---

## Anatomy

```
tooltip.provider              // optional, supplies inherited timing defaults
└─ tooltip
   ├─ tooltip.trigger         // the focusable / hoverable element
   └─ tooltip.content         // the popover surface
```

## States

- **closed** — not visible.
- **opening** — pending an open after the hover delay.
- **open** — visible, anchored to the trigger.
- **closing** — visible but committed to closing after the close delay; can
  return to open if the pointer re-enters.

`open` and `closing` are both visually open. Consumers should treat them
as a single visible bit.

## Available presentation states

Reported on the trigger and the content so the styling layer can react.

- `closed` — not visible.
- `delayed-open` — just opened after paying the full hover delay.
- `instant-open` — just opened inside the skip-delay window.
- `disabled` — the tooltip is currently suppressed.

The resolved placement side (top / bottom / left / right) is also reported
on the content so side-specific styling can branch on it.

## Behavior

### Opening

- Hover on the trigger for the open delay duration → opens.
- Focus on the trigger → opens immediately, no delay.
- If another tooltip has just closed within the skip-delay window, the
  next hovered tooltip opens immediately instead of paying the full
  hover delay.
- A controlled open prop overrides all of the above.

### Closing

- Pointer leaves the trigger → closes after the close delay.
- During that grace period, if the pointer enters the content the
  tooltip stays open until the pointer leaves the content too. This
  behavior can be disabled, in which case leaving the trigger closes
  the tooltip immediately even if the pointer is heading to the content.
- Blur of the trigger → closes immediately.
- Escape → closes; focus stays on the trigger. Cancelable via callback.

### Mutual exclusion

Only one tooltip is visible at a time. Opening one closes any other.

### Positioning

The tooltip is anchored to the trigger and rendered on one of the four
sides. Authors pick a preferred side; the renderer adjusts when that side
doesn't fit. An offset along the anchor-axis controls the gap between
trigger and tooltip, and an offset along the perpendicular axis nudges
the alignment.

The resolved side (after any adjustment) is reported as a presentation
state on the content so styling can branch on it — including the arrow
direction when consumers add one.

### Viewport visibility

The tooltip is expected to stay inside the viewport. When the preferred
side would clip, the renderer flips to the opposite side. When both
fail, it falls back to the most-visible candidate. Sticky scrolling
keeps the tooltip pinned to its trigger while the page scrolls; if the
trigger leaves the viewport, the tooltip dismisses.

Position is recomputed when the trigger moves, the window resizes, or
the surrounding content scrolls. The tooltip never partially occludes
the trigger; when no side fits without overlap, the renderer prefers
clipping the tooltip's far edge over covering the anchor.

### Disabled

When a tooltip is disabled, no source — hover, focus, or controlled
prop — opens it. Existing open tooltips dismiss.

## Accessibility

- The trigger keeps its native role (button, link, etc).
- The content is announced as a tooltip.
- The trigger references the content as its description, not its name.
  Tooltips supplement an existing label; they're not a substitute for one.
- Tooltips must not contain interactive controls. A clickable popover is
  a different primitive.

## Keyboard

- **Focus**: opens the tooltip immediately.
- **Blur**: closes the tooltip.
- **Escape**: closes the tooltip; focus stays on the trigger. Consumers
  can intercept and cancel this.
- **Tab**: moves focus normally; nothing tooltip-specific.

## Inheritance

A provider can supply defaults for hover delay, close delay, skip-delay
window, and the "hoverable content" preference. Tooltips inside a
provider inherit those values unless they override them. Tooltips with
no provider use the library defaults.

The provider's defaults are shared timing; per-tooltip concerns
(disabled, controlled open) stay on the tooltip itself.
