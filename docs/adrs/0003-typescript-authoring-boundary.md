# ADR 0003: TypeScript Authoring Boundary

Status: Accepted

Weight: P0

## Context

The value of Naos depends on a strong authoring interface. Authors should get
typed props, events, JSX attributes, component options, and compiler-only API
feedback before code reaches the native transform.

## Decision

TypeScript owns authoring types, package ergonomics, JSX surface, and Vite
integration. Public authoring APIs must be modeled in TypeScript first and
backed by runtime stubs that fail clearly when used outside transformed source
files.

## Alternatives

* Use untyped marker functions and rely on Rust diagnostics.
* Generate all authoring types from Rust as a later release step.
* Expose only generated JavaScript and leave authoring validation to examples.

## Consequences

* Type tests are part of the product contract.
* TypeScript APIs must stay aligned with Rust compiler semantics.
* Public authoring names should remain stable even when generated output
  changes.
* Compiler-only functions must never silently execute as real runtime helpers.

## Related Milestones

M2, M6, M10, M11, M12, M13, M14

