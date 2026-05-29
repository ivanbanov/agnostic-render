# Agent + contributor guide

The working contract for anyone (human or agent) modifying code in this
repo. Read this first.

For the *what* and *why*, see:
- `README.md` — what this project is + how to run it.
- `ARCHITECTURE.md` — the layered model and where things live.
- `packages/core/components/<comp>/SPEC.md` — per-component intent.

Keep this file under ~120 lines. If a rule needs a paragraph of context,
the rule belongs in `ARCHITECTURE.md` and a one-line summary lands here.

---

## What never crosses a boundary

- **Core never imports React, RN, the DOM, or any substrate.** Core is pure JS.
- **Adapters never reimplement state.** Read from the machine via `connect()`.
- **Generated files are never edited by hand.** Re-author the source spec.
- **Adapter packages never depend on each other.** React doesn't import from native.

---

## Where new things go

- A new visual variant → `elements/<part>.ts` (variant + default). Codegen propagates.
- A new prop → `types.ts`, default in `props.ts`, consume in machine or view as appropriate.
- A new state or transition → `machine.ts`. If the API surface changes, also `connect.ts` and `types.ts`.
- A new substrate-specific effect (DOM listener, RN BackHandler) → declare a no-op in `machine.ts`, implement in each adapter's `adapter.ts`.
- A new accessibility attr → extend `AttrBindings` in machine-core, map in every adapter's `normalize`.
- A new algorithmic helper (step, typeahead, …) → `utils.ts` in the component.

If your change is a new *file shape* per component — stop. Mirror the
existing structure (see `ARCHITECTURE.md`) instead of inventing.

---

## Specs are intent, not API mirrors

`SPEC.md` describes behavior in **human terms**, not in prop names.

- ❌ `openDelay: number — ms before opening (default 400)`
- ✅ `Trigger hover continues for the open delay → tooltip opens`

Prop names belong in `types.ts`. The spec describes *what the component
does* so the doc survives renames and refactors. When code changes a
prop name, the spec doesn't need an edit.

---

## Discipline for any code change

Before merging:

1. **Did behavior change?** Update `SPEC.md` (the affected sections only).
2. **Are tests up to date?** Bug fix → tests cover the regression. Behavior change → tests reflect the new spec.
3. **Did generated files need a refresh?** Run `pnpm codegen`.
4. **Public API still stable?** If a published name changed, flag it as a breaking change.

The spec drives the tests. Tests are the executable form of the spec.
The code is the implementation we check against both.

---

## Functional vs. cosmetic styles

In `elements/<part>.ts`:

- **Functional** (must stay): position, pointerEvents, edge-pinning variants, visibility toggles. Removing or renaming these breaks the component.
- **Cosmetic** (eventually theme-controlled): colors, padding, font, radius. The consumer or theme supplies these.

Today both live together. The merge boundary doesn't exist yet — when it
does, functional stays in core and cosmetic moves to a theme layer.

---

## What NOT to do

- Don't import `react`, `react-native`, `document`, `window`, or any substrate from `packages/core/**`.
- Don't hand-edit `elements.ts` or `api.ts` in adapter packages.
- Don't put cosmetic styles in `machine.ts` or behavioral state in `elements/`.
- Don't add prop names to `SPEC.md`. Describe behavior, not the API.
- Don't share styles across components by importing — duplicate the spec or extract to a token (when tokens land).
- Don't spread the component's resolved props onto a styled element. Spread the *consumer's* props via `mergeProps`. See render layers for the pattern.

---

## When in doubt

- New decision rule that everyone should follow? Add a one-liner here.
- Decision rule scoped to one package? Add an `AGENT.md` in that package.
- Component-specific decision? Belongs in that component's `SPEC.md`.
- Deep model question (why does host/adapter exist?) → `ARCHITECTURE.md`.

If you find yourself writing the same rule in three places, it belongs here.
