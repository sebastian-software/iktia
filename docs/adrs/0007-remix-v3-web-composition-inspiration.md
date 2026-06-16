# ADR 0007: Remix v3 Web Composition Inspiration

Status: Accepted

Weight: P1

## Context

Remix v3 emphasizes Web APIs, dependency restraint, composition, cohesive
distribution, model-friendly source, and a UI direction closer to native DOM
semantics. Iktia shares several of those design ideals, but it is a compiler
for Web Components rather than a full-stack runtime framework.

## Decision

Use Remix v3 as design inspiration for Web composition, not as a dependency or
compatibility target. Iktia should favor platform types such as `EventTarget`,
`AbortSignal`, `CustomEvent`, DOM elements, `Request`, `Response`, and
`Headers` where they naturally fit. Helpers should be single-purpose,
replaceable, and exposed through a cohesive package surface.

Iktia explicitly does not adopt Remix v3's runtime-first principle. This
project remains compiler-first because its core product is generated native Web
Component output.

## Alternatives

* Ignore Remix v3 because Iktia is not a full-stack framework.
* Copy Remix v3 APIs directly.
* Move Iktia toward a runtime framework with router, server, and data layers.

## Consequences

* `on()` and host lifecycle helpers should use Web platform types.
* Dependency additions must be justified and wrapped.
* Public APIs should be readable by humans and model-assisted tools.
* Documentation must distinguish inspiration from compatibility.

## Related Milestones

M14, M15, M17

