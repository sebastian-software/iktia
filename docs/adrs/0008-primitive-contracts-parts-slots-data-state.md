# ADR 0008: Primitive Contracts With Parts, Slots, And Data State

Status: Accepted

Weight: P2

## Context

Component primitives need stable styling, accessibility, and inspection
contracts. Web Components already provide `part`, slots, attributes, properties,
and ARIA. Iktia should Iktia on those mechanisms rather than invent a styling
runtime.

## Decision

Use platform-native primitive contracts:

* `part` names for stable styling hooks.
* Named and default slots for composition.
* `data-state`, `data-disabled`, and `data-orientation` for stateful styling.
* `aria-*` for accessibility state and relationships.

These conventions should be documented and tested with small fixtures before a
larger component library is considered.

## Alternatives

* Generate a CSS-in-JS runtime.
* Hide state in internal fields only.
* Create a full UI primitive library before compiler semantics are stable.
* Depend on a third-party primitive system.

## Consequences

* Components are styleable and inspectable through standard DOM mechanisms.
* Accessibility expectations can be tested at the fixture level.
* The project can build primitive conventions without committing to a UI kit.
* Public examples should prefer stable parts and data attributes.

## Related Milestones

M8, M15

