# ADR 0001: Platform-Native Web Components

Status: Accepted

Weight: P0

## Context

Iktia exists to turn typed TSX authoring into native browser components. The
project needs a stable integration contract for design systems, embedded
widgets, and multi-framework product surfaces.

## Decision

Generated output targets platform-native Custom Elements. Components register
through `customElements.define()`, extend `HTMLElement`, use platform DOM APIs,
and expose Web Component styling and composition contracts such as Shadow DOM,
slots, attributes, properties, `part`, and `CustomEvent`.

## Alternatives

* Generate framework components for React, Solid, Vue, or Svelte.
* Generate a custom runtime component model that only looks like Web
  Components at the package boundary.
* Treat Web Components as one optional backend among several targets.

## Consequences

* The browser platform is the public runtime contract.
* Cross-framework interop is achieved through native elements, not adapters.
* The compiler must respect Custom Element naming, lifecycle, attributes,
  properties, and event semantics.
* Some framework conveniences must be expressed as compile-time features or
  native Web Component conventions.

## Related Milestones

M0, M4, M7, M8, M15

