# Dialog — spec

A window overlaid on the page that interrupts the flow and asks for a response
before the user returns to the rest of the app. Modeled after the
[Radix UI Dialog] API surface and the [W3C APG Modal Dialog pattern] for the
focus + keyboard semantics.

[Radix UI Dialog]: https://www.radix-ui.com/primitives/docs/components/dialog
[W3C APG Modal Dialog pattern]: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

---

## Anatomy

```
dialog
├─ dialog.trigger          // the element that opens it
└─ dialog.content          // the dialog surface (the window)
   ├─ dialog.overlay       // the backdrop behind the window
   ├─ dialog.title         // the dialog's heading
   ├─ dialog.description   // an optional supporting line
   └─ dialog.close         // an element that closes it
```

The window and its backdrop are lifted above the rest of the app, so the dialog
sits on top regardless of where the trigger lives in the page.

## States

- **closed** — only the trigger is present; the window is not shown.
- **open** — the window is visible over the page; while modal, the rest of the
  page is set aside until the dialog is dismissed.

## Behavior

### Opening

- Activating the trigger opens the dialog.
- A consumer may drive the open state directly. When they do, the dialog never
  changes its own visibility — it reports the intent and the consumer decides
  whether to honor it.

### Closing

- Activating a close control dismisses the dialog.
- Escape dismisses the dialog. A consumer can intercept and cancel this.
- Pressing on the backdrop — anywhere outside the window — dismisses the dialog.
  A consumer can intercept and cancel this.

### Modal vs non-modal

A dialog is modal by default: while it is open the rest of the page is set
aside — it can't be interacted with, the backdrop covers it, and page scrolling
is held — so attention stays on the dialog until it closes.

A dialog can instead be non-modal, floating above the page while the rest stays
fully usable. A dialog presents itself as modal only when it both prevents
interaction with the content behind it and visually obscures it.

## Focus

- **On open** — focus moves into the dialog, landing on the first thing the user
  can act on, or on the window itself when there is nothing actionable inside.
- **While open (modal)** — focus stays within the dialog: moving past the last
  item loops back to the first, and moving back from the first loops to the
  last. Keyboard navigation never escapes the open dialog.
- **On close** — focus returns to whatever opened the dialog, so the user picks
  up where they left off.

## Keyboard

- **On the trigger** — the usual activation keys open the dialog.
- **Inside the open dialog** — moving forward and backward cycles through the
  dialog's contents and never leaves it (see Focus).
- **Escape** — dismisses the dialog and returns focus to the trigger. Cancelable.

## Accessibility

- The window is announced as a dialog, and as a modal one while it holds the
  page aside.
- The title gives the dialog its name; the description, when present, gives it
  supporting context — both announced when the dialog opens.
- The trigger conveys that it opens a dialog and whether that dialog is open.
- The close control is a real, reachable control in the keyboard order.

## Controlled vs. uncontrolled

The dialog manages its own open state by default, optionally starting open. A
consumer may take over that state instead; the dialog then never opens or closes
itself, and routes every open/close intent to the consumer to decide.
