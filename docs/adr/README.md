# Architecture Decision Records

Decisions that shape the project's architecture — the ones worth not
relitigating from scratch later. Each ADR captures the **context** at the time,
the **decision**, and its **consequences**, so a future reader understands
*why*, not just *what*.

## Format (trimmed [MADR](https://adr.github.io/madr/))

```
# ADR-NNNN: <short title>

- Date: YYYY-MM-DD

## Context     — what forces are at play / what problem we're deciding
## Decision    — what we decided, plainly
## Consequences — what becomes easier, harder, or off the table
## Alternatives considered — what else we weighed, and why not
## Revisit when — the concrete signal that would reopen this
```

## Conventions

- Filename `NNNN-kebab-title.md`, zero-padded.
- An ADR is **immutable once written**. To change a decision, write a new ADR
  that supersedes it and add a `Superseded by ADR-XXXX` line at the top of the
  old one. Don't edit the original's decision.
- Keep them short — a memo, not a design doc.

## Index

| ADR | Title |
| --- | --- |
| [0001](./0001-reactivity-kernel-preact-signals.md) | Reactivity kernel: @preact/signals-core |
