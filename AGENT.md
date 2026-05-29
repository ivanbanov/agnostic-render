# Agent + contributor guide

The working contract for anyone (human or agent) modifying code in this
repo. Read this first.

For the _what_ and _why_, see:

- `README.md` — what this project is + how to run it.
- `ARCHITECTURE.md` — the layered model and where things live.
- `packages/core/components/<comp>/SPEC.md` — per-component intent.

## Boundaries

- **Core never imports React, RN, the DOM, or any substrate.** Core is pure JS.
- **Adapters never reimplement state.** Read from the machine via `connect()`.
- **Generated files are never manually edited.** Re-author the source spec.

## New stuff

If the change needs a new file - STOP - and think why it is needed and if it can
be reworked in the existing structure (see `ARCHITECTURE.md`) instead of inventing.

If not discuss edge cases and how to properly document it.

## Specs are intent, not API mirrors

`SPEC.md` describes behavior in **human terms**, not in prop names.

- ❌ `openDelay: number — ms before opening (default 400)`
- ✅ `Trigger hover continues for the open delay → tooltip opens`

The spec describes _what_ so the doc survives renames and refactors.

## Workflow

The spec drives the tests; tests are the executable form of the spec; code
is the implementation we check against both. The human orchestrates the AI.

Before merging, walk this checklist:

1. **Did behavior change?** Update the affected sections of `SPEC.md`.
   Bug fix that restores documented behavior → spec stays, tests catch
   the regression. New behavior or contract change → spec changes too.
2. **Do tests reflect the spec?** A spec without a matching test is a
   gap; a test without a matching spec entry is a leak. Reconcile both.
3. **Did the core change?** Make sure it is a agnostic change otherwise
   move it into the correct target

## Rules

- Global decisions are described in this file.
- If a package needs a specific guidrails, add `AGENT.md` to the it.
- Stick to the architecture `ARCHITECHTURE.md`
- Make sure the changes are properly reflected in the `SPEC.md` and `tests/`
