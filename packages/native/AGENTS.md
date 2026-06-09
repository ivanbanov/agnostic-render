# Native target rules

Nearest-wins over the root `AGENTS.md` for anything under `packages/native`.

## Overlays must render in window space (RN `Modal`)

RN's `position: absolute` is relative to the nearest positioned **ancestor**,
not the window. An inline popover/overlay therefore lands offset by the
trigger's distance from its container (the classic "floats to the bottom" bug).
Any part that floats above the page — tooltip content, menu, dialog overlay —
must render through an RN `<Modal transparent visible onRequestClose={…}>`.
Inside it, position with **window coordinates** from
`triggerRef.measureInWindow(…)`. A full-screen `Pressable` inside the Modal is
the tap-outside catcher; the floating Content stops the touch from bubbling to
it (`onStartShouldSetResponder`).

## RN `Text` doesn't inherit color/font from a `View`

Text parts must be `Text` elements (the codegen's text-part convention handles
this — name them `title` / `description` / etc.). Don't re-declare a part's text
color as a constant in the render; if you're tempted to, the part should be a
text element instead.

## What does NOT exist on native (web-only behaviors)

- **No focus trap / initial focus / focus return** — RN has no DOM focus model.
  A modal's `Modal` already makes the page behind it inert; the focus props are
  no-ops here, by design.
- **No scroll lock** — n/a (the Modal handles inertness).
- **No hover** — use long-press / focus / press instead.
- **No keyboard Tab/Arrow** — those navigation props are inert.

Document these as comments in the component's `render.tsx` header (see the
tooltip / dialog).

## Platform listeners

Escape's analog is the **Android hardware back button** via `BackHandler`
(`hardwareBackPress`), wired as a `ComponentEffect` in `effects.ts`, reusing the
same agnostic `resolve*` veto helper the web Escape listener uses.

## Dependency pins (sandbox)

- The native sandbox's `react` must **exactly match** the version RN's renderer
  ships (e.g. RN 0.85 → `react` 19.2.3). A mismatch throws "Incompatible React
  versions" at runtime.
- Prefer RN core over native-module deps: a JS-only add of a native module
  (e.g. `expo-linear-gradient`) is undefined at runtime in a prebuilt dev
  client. Use core RN (e.g. `experimental_backgroundImage`) so no rebuild is
  needed.
