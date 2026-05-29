# Tooltip — spec

A short, transient surface that describes a trigger element. Always informational,
never interactive. Modeled after [Radix UI Tooltip] with [W3C APG] semantics.

[Radix UI Tooltip]: https://www.radix-ui.com/primitives/docs/components/tooltip
[W3C APG]: https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/

This document is the **contract** the implementation should match. The
"Current divergence" section at the bottom enumerates where we deviate
today and whether each gap is addressed by this iteration.

---

## Anatomy

```
Tooltip.Provider                 // optional; supplies default timing across many tooltips
└─ Tooltip.Root                  // owns the state machine for one tooltip
   ├─ Tooltip.Trigger            // the focusable / hoverable element
   └─ Tooltip.Content            // the popover surface (role="tooltip")
```

Out of scope for v1: `Tooltip.Arrow`, `Tooltip.Portal`, `asChild`,
visual hotkey/metadata slots.

---

## API

### `Tooltip.Provider`

Wraps a subtree to supply defaults for nested tooltips. Optional — Roots
work standalone, falling back to library defaults.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `openDelay` | `number` (ms) | `400` | Hover dwell before opening. |
| `closeDelay` | `number` (ms) | `150` | Pointer-leave grace before closing. |
| `skipDelayDuration` | `number` (ms) | `300` | After any tooltip closes, the next one opens instantly within this window. `0` disables instant-open. |
| `disableHoverableContent` | `boolean` | `false` | When `true`, the tooltip closes immediately when the pointer leaves the trigger — content is not hoverable. |

### `Tooltip.Root`

Owns the machine for one tooltip instance. All props are optional and
inherit from the nearest `Provider`.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `open` | `boolean` | — | Controlled open. |
| `defaultOpen` | `boolean` | `false` | Uncontrolled initial state. |
| `onOpenChange` | `(details: { open: boolean }) => void` | — | Fires when the open state changes, controlled or not. |
| `openDelay` | `number` | inherits | Overrides Provider. |
| `closeDelay` | `number` | inherits | Overrides Provider. |
| `disableHoverableContent` | `boolean` | inherits | Overrides Provider. |
| `disabled` | `boolean` | `false` | Suppresses all handlers. The tooltip never opens. |
| `closeOnEscape` | `boolean` | `true` | Allows Escape-to-close. Set `false` to keep Escape from dismissing. |

The `disabled` flag is local to Root (no Provider equivalent — disabled is
per-tooltip).

### `Tooltip.Trigger`

Renders the element users hover/focus. Inherits its element's native
role. Receives:

- `id` — generated, referenced by Content via `aria-describedby`.
- `aria-describedby={contentId}` while open; absent when closed.
- `disabled` (HTML) when `Root.disabled` is `true`.
- `data-state` — see below.

### `Tooltip.Content`

The popover surface.

| Prop | Type | Default | Notes |
|---|---|---|---|
| `side` | `"top" \| "right" \| "bottom" \| "left"` | `"bottom"` | Preferred side; collision logic may flip. |
| `sideOffset` | `number` | `0` | Distance from the trigger along the side axis. |
| `align` | `"start" \| "center" \| "end"` | `"center"` | Alignment along the perpendicular axis. |
| `alignOffset` | `number` | `0` | Shift along the alignment axis. |
| `onEscapeKeyDown` | `(event) => void` | — | Fires when Escape is pressed while open. Call `event.preventDefault()` to keep the tooltip open. |

Receives:

- `role="tooltip"`
- `id` — referenced by the Trigger.
- `data-state`, `data-side`, `data-align` — see below.

### Event handlers (consolidated)

| Handler | Lives on | Fires when |
|---|---|---|
| `onOpenChange` | Root | Open state changes from any source. |
| `onEscapeKeyDown` | Content | Escape pressed while open. `preventDefault` keeps it open. |

---

## ARIA + keyboard

Per [W3C APG]:

- Trigger keeps its native role.
- Content has `role="tooltip"`.
- Trigger references Content via `aria-describedby`. (`aria-labelledby`
  is wrong unless the tooltip text is the trigger's *only* accessible
  name — out of scope; consumers should always provide a real label.)
- **Focus on trigger** → opens immediately (no delay).
- **Blur trigger** → closes immediately.
- **Hover trigger** → opens after `openDelay`.
- **Pointer leaves trigger** → closes after `closeDelay`. If the pointer
  enters the Content (and `disableHoverableContent` is `false`), the
  tooltip stays open until the pointer leaves the content too.
- **Escape** → closes; focus stays on trigger. Cancelable via
  `Content.onEscapeKeyDown`.
- **Tab** → moves focus normally; the tooltip closes on blur. No special
  handling.

Tooltip content must not contain interactive elements. If you need a
clickable popover, use a Popover/Dialog primitive instead.

---

## Data attributes

Emitted on Trigger and Content for CSS styling (entry/exit animations,
side-specific layout):

| Attribute | Values | Where |
|---|---|---|
| `data-state` | `"closed" \| "delayed-open" \| "instant-open"` | Trigger, Content |
| `data-side` | `"top" \| "bottom" \| "left" \| "right"` | Content |
| `data-align` | `"start" \| "center" \| "end"` | Content |
| `data-disabled` | `""` (only when disabled) | Trigger |

`delayed-open` means the tooltip just paid the full `openDelay`.
`instant-open` means it opened inside the skip-delay window.

---

## States

```
closed ──hover──► opening ──after openDelay──► open
   ▲                 │
   │                 └──pointer.leave──► closed
   │
   │            ┌──pointer.leave (when interactive)──► closing
open ┘                                                    │
                                                          └──after closeDelay──► closed
                                                          └──pointer.move (re-enter)──► open
```

`open` and `closing` both render as visually open. Consumers should treat
`open || closing` as "visible." (Our connect collapses this into a single
boolean: `api.open`.)

---

## Connect output

The substrate-agnostic surface produced by `connectTooltip(snapshot)()`:

```ts
{
  open: boolean,                          // visible (state ∈ {open, closing})
  setOpen: (next: boolean) => void,
  parts: {
    trigger: Part,                        // handlers + attrs
    content: Part<                        // handlers + attrs + variants + positioning + rendered
      TooltipContentVariants,
      { positioning: PositioningOptions; rendered: boolean }
    >,
  },
}
```

`variants` for the content part:

```ts
{
  side: "top" | "bottom" | "left" | "right",   // resolved side after collision
  red: boolean,                                 // legacy app-specific tone — see "Current divergence"
}
```

The `data-state` / `data-side` / `data-align` attributes referenced above
are emitted into `parts.{trigger,content}.attrs` by the React adapter
(they're DOM-specific; native/pixi don't surface them).

---

## Skip-delay semantics

When **any** tooltip in the tree closes, a global skip-delay window
opens (default 300 ms). During that window, the **next** tooltip to be
hovered opens with no delay. The window closes once consumed or once it
expires.

This implies a shared singleton store across all tooltip instances on the
page (matches both Radix and our existing `tooltipStore`).

---

## Test cases (canonical inventory)

The implementation must pass at least these. Borrowed from Miro's
inventory, distilled to behaviors.

**State**
- Opens by default when `defaultOpen` is true.
- Stays closed by default when `defaultOpen` is false.
- Respects controlled `open` prop.
- `onOpenChange` fires on every open/close transition.

**Hover + delay**
- Opens on trigger hover after `openDelay`.
- Does not open before `openDelay` elapses.
- Custom `delayDuration` (Root or Provider) honored.
- Root-level `openDelay` overrides Provider.
- Pointer leaves trigger before `openDelay` elapses → tooltip never opens.

**Focus**
- Opens on trigger focus with no delay.
- Closes on trigger blur.

**Close**
- Closes on Escape.
- `closeOnEscape={false}` ignores Escape.
- `onEscapeKeyDown.preventDefault()` cancels the close.
- Interactive content (default): tooltip stays open while pointer is on content.
- `disableHoverableContent={true}`: tooltip closes when pointer leaves trigger even if pointer enters content.

**Skip delay**
- Second tooltip opens instantly while inside the skip-delay window.
- Second tooltip pays full delay once the window expires.
- `skipDelayDuration={0}` disables instant-open entirely.

**Disabled**
- `disabled={true}` suppresses all hover/focus opens.
- `aria-disabled` (or HTML `disabled`) is emitted on the trigger.

**ARIA**
- Trigger gets `aria-describedby={contentId}` while open.
- Trigger has no `aria-describedby` while closed.
- Content has `role="tooltip"`.

**Data attributes (React adapter)**
- `data-state` reflects `delayed-open` / `instant-open` / `closed`.
- `data-side` reflects the resolved side.

---

## Current divergence (and what this iteration addresses)

| # | Gap | Action this iteration |
|---|---|---|
| 1 | No `Provider`. Skip-delay hard-coded. | **Addressed.** Add `Tooltip.Provider` with `openDelay` / `closeDelay` / `skipDelayDuration` / `disableHoverableContent`. |
| 2 | `disableHoverableContent` not modeled. | **Addressed.** Add the prop; rename `interactive` → derived `!disableHoverableContent` for back-compat at the connect level. |
| 3 | Collision props collapsed under `positioning`. | Deferred. Spec enumerates the eventual surface; current impl exposes only `placement` + `offset`. |
| 4 | No `Arrow` part. | Deferred. Spec lists in "Future scope." |
| 5 | No `Portal` part. | Deferred. Portaling is currently adapter-internal. |
| 6 | `data-state` / `data-side` / `data-align` not emitted. | **Addressed.** Add to `attrs`; React adapter passes through. |
| 7 | Escape has no callback. | **Addressed.** Add `Content.onEscapeKeyDown` with cancelable semantics. |
| 8 | `onPointerDownOutside` not surfaced. | Deferred. Tooltips dismiss on blur/leave; pointer-down-outside is overkill. |
| 9 | `asChild` not addressed. | Deferred. React adapter already uses `cloneOnly` on Trigger, which is functionally similar. |
| 10 | No label-vs-describe heuristic. | Deferred. Always emit `aria-describedby`. Consumers de-duplicate at the call site if needed. |
| 11 | `onOpenChange` payload shape. | Keep `{ open }`. Documented. |
| 12 | `red` variant not in Radix/Miro. | **Addressed.** Drop `red` from the contract. Consumers can theme tooltips externally. |
| 13 | `closeOnClick` / `closeOnPointerDown` not in Radix/APG. | **Addressed.** Drop both. Tooltip is informational; activation of the underlying button is a separate concern. |
| 14 | No `Hotkey` / `Metadata` slots. | Out of scope. Consumers compose inside Content. |

## Future scope

- `Tooltip.Arrow` — visual connector.
- `Tooltip.Portal` — explicit portal target with `forceMount`/`container`.
- `asChild` on Trigger/Content for prop merging without an extra DOM node.
- Full collision props (`avoidCollisions`, `collisionBoundary`,
  `collisionPadding`, `sticky`, `hideWhenDetached`).
- Label/describe heuristic when content is short enough to *be* the label.
- `onPointerDownOutside` if/when we add overlay-style tooltips.
