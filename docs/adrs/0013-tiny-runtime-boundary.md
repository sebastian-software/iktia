# ADR 0013: Tiny Runtime Boundary

Status: Accepted

Weight: P1

## Context

Naos's core promise is native Custom Element output without React, Vue, a
virtual DOM, or a framework runtime. At the same time, generated components
should not duplicate identical low-level helpers in every output module.

The existing `@naos-ui/runtime` package is very small and currently contains
platform helper behavior rather than a component runtime.

## Decision

Keep `@naos-ui/runtime` as a tiny public platform-helper runtime for v0.1.

Allowed runtime responsibilities:

* `CustomEvent` helper behavior;
* scheduling helpers used by generated output;
* hydration helpers used by generated output;
* small DOM/platform utilities that reduce generated-code duplication.

Disallowed runtime responsibilities:

* virtual DOM;
* reconciler;
* component lifecycle runtime;
* hook runtime;
* framework compatibility layer;
* cross-framework adapter model.

Generated components may import `@naos-ui/runtime` only for these small platform
helpers. Public docs must describe it as a helper runtime, not as the place
where component semantics live.

## Alternatives

* Inline all helpers into every generated component.
* Make `@naos-ui/runtime` internal and unpublished.
* Grow `@naos-ui/runtime` into a component runtime.

## Consequences

* Generated output can stay smaller and more consistent.
* The runtime package becomes part of the public release set.
* Runtime review must reject features that would move component semantics out
  of the compiler.
* ADR 0004 remains intact: this is not a framework runtime.

## Related Milestones

v0.1 M4, M7
