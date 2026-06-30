# ADR 0004: No Framework Runtime

Status: Accepted

Weight: P0

## Context

Naos is inspired by React, Solid, Signals, Remix v3, and Web Component
libraries, but the project exists to compile TSX authoring into native elements.
Shipping another framework runtime would weaken that position.

## Decision

Generated components must not depend on React, Solid, Remix, Preact, Lit,
Stencil, or a virtual DOM runtime. Small generated helpers are allowed when they
implement platform-facing behavior such as scheduling, attribute conversion,
event dispatch, style injection, and lifecycle cleanup.

## Alternatives

* Wrap a Solid or Preact component in a Custom Element.
* Generate LitElement subclasses.
* Ship a Naos runtime that performs reconciliation in the browser.

## Consequences

* The compiler must emit direct DOM and Custom Element code.
* Runtime helpers must remain small and inspectable.
* Framework-like features need explicit compiler support.
* Compatibility with framework ecosystems happens through native Web Components,
  not runtime adapters.

## Related Milestones

M4, M7, M10, M11, M12, M13

