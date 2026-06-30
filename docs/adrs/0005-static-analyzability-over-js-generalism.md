# ADR 0005: Static Analyzability Over JavaScript Generalism

Status: Accepted

Weight: P0

## Context

TSX can express arbitrary JavaScript. Naos cannot safely compile all of that
without becoming a runtime framework. The project needs clear syntax boundaries
that keep generated output predictable.

## Decision

Prefer explicit, statically analyzable authoring constructs over general
JavaScript rendering patterns. Unsupported patterns should fail with clear
diagnostics until a dedicated compiler feature exists.

## Alternatives

* Accept arbitrary JSX expressions and patch behavior with runtime diffing.
* Allow dynamic tags, arbitrary maps, and conditional trees from the start.
* Treat the compiler as a best-effort transpiler and rely on browser behavior.

## Consequences

* Dedicated compiler constructs are preferred over arbitrary conditional or
  list expressions.
* The compiler can generate direct DOM updates instead of VDOM reconciliation.
* Authors get a smaller language, but clearer failure modes.
* The accepted syntax boundary must be documented and tested.

## Related Milestones

M3, M4, M13, M16
