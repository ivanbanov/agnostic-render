# Dialog — spec

A window overlaid on the page that interrupts the flow and requires a response
before the user returns to the rest of the app. Modeled after the
[Radix UI Dialog] API surface and the [W3C APG Modal Dialog pattern] for ARIA +
focus + keyboard semantics.

[Radix UI Dialog]: https://www.radix-ui.com/primitives/docs/components/dialog
[W3C APG Modal Dialog pattern]: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

---

## Anatomy

```
dialog                                 // owns the open/closed state
├─ dialog.trigger                      // the button that opens it
└─ dialog.portal                       // renders the layers at the page root
   ├─ dialog.overlay                   // the backdrop behind the dialog
   └─ dialog.content                   // the dialog surface (the window)
      ├─ dialog.title                  // accessible name, announced on open
      ├─ dialog.description            // optional accessible description
      └─ dialog.close                  // a button that closes it
```

The portal lifts the overlay + content out to the page root so the dialog sits
above the rest of the app regardless of where the trigger lives in the tree.

## States

- **closed** — nothing rendered beyond the trigger.
- **open** — overlay + content mounted; the dialog is visible and (when modal)
  the rest of the page is inert.

`data-state` reflects `open` / `closed` on the trigger, overlay, and content.

## Behavior

### Opening

- Activating the trigger (click, or Enter / Space) → opens.
- A controlled `open` prop overrides the internal state; all internal opens and
  closes route through `onOpenChange`, never mutating the controlled value.

### Closing

- Activating a close button → closes.
- Escape while open → closes. Cancelable via `onEscapeKeyDown` (preventDefault
  keeps it open).
- Pointer down outside the content (on the overlay / the rest of the page) →
  closes. Cancelable via `onPointerDownOutside` (preventDefault keeps it open).
- The component never closes itself when controlled — it asks via
  `onOpenChange` and the controller decides.

### Modal vs non-modal

`modal` (default `true`) governs whether the dialog makes the rest of the page
inert:

- **modal** — content outside the dialog is inert (not focusable, not
  interactive); the backdrop blocks pointer interaction with the page; page
  scroll is locked; `aria-modal="true"` is set on the content.
- **non-modal** — the dialog floats above the page but the rest stays
  interactive; no scroll lock, no inert, no `aria-modal`.

A dialog is marked modal only when both the code prevents interaction outside it
**and** the styling obscures that content — per the W3C note.

## Focus management

- **On open** — focus moves into the dialog: to the first focusable element
  inside the content, or to the content surface itself (a `tabindex=-1` target)
  when there is none. Authors may redirect this.
- **While open (modal)** — focus is trapped: Tab from the last focusable wraps
  to the first; Shift+Tab from the first wraps to the last. Focus never leaves
  the dialog via the keyboard.
- **On close** — focus returns to the element that opened the dialog (the
  trigger), unless that element is gone.

## Accessibility

- The content surface is announced as a dialog (`role="dialog"`), and as modal
  (`aria-modal="true"`) when modal.
- The content references its title as the accessible name
  (`aria-labelledby` → the title's id) and its description as the accessible
  description (`aria-describedby` → the description's id) when each is present.
- The trigger reports that it opens a dialog and whether it is currently open;
  while open it references the content's id.
- The close button is a real button in the tab sequence.

## Keyboard

**On the trigger:**

- Enter / Space → open.

**Inside the open dialog:**

- Tab → next focusable inside the dialog; wraps to the first at the end.
- Shift+Tab → previous focusable; wraps to the last at the start.
- Escape → close; focus returns to the trigger. Cancelable.

## Controlled vs. uncontrolled

Open state is uncontrolled by default (`defaultOpen`, default `false`). Authors
can supply a controlled `open` + `onOpenChange`; the component then never
mutates the value itself and routes every open/close intent through the
callback.
