# ADR 0010: Declarative Shadow DOM Output And Hydration

Status: Accepted

Weight: P1

## Context

Iktia currently generates imperative Custom Element modules that attach an open
shadow root in JavaScript and then create DOM nodes during upgrade. That is a
reasonable client-side MVP, but it means the browser cannot see the component's
shadow DOM structure or scoped styles during initial HTML parsing.

Declarative Shadow DOM allows a server, static generator, or prerender tool to
emit `<template shadowrootmode="open">` inside the host element. Modern browsers
can parse that template into a shadow root before the custom element JavaScript
loads. This is aligned with Iktia's platform-native output goal, but it also
changes the hydration contract: generated code must reuse existing declarative
roots instead of blindly calling `attachShadow()`.

## Decision

Treat Declarative Shadow DOM as a first-class prerender output and hydration
direction for Iktia components.

The first implementation must:

* keep DSD in an explicit prerender/static-HTML path, not the normal client
  transform;
* enable DSD by default for components in that prerender path;
* avoid a new `ComponentOptions.dsd` or render-mode option in v1;
* use prerender include/exclude filters for opt-out;
* adopt existing declarative shadow roots before any `attachShadow()` fallback;
* emit only `shadowrootmode="open"` in v1;
* emit visible `data-iktia-*` hydration markers only in DSD HTML;
* evaluate only prop defaults, signal/state initializers, literal
  arrays/objects, and simple template strings over those supported values;
* never execute arbitrary JavaScript or TypeScript during DSD prerender;
* throw deterministic hydration mismatch diagnostics in development;
* fall back to imperative remounting on hydration mismatch in production;
* omit core DSD polyfills and rely on the imperative JS fallback for old
  browsers;
* keep form-heavy primitives on slotted native light-DOM controls until
  form-associated Custom Elements are implemented.

The first public DSD demo should cover both Counter and Toggle once hydration
is available.

## Alternatives

* Keep imperative Shadow DOM only.
* Enable DSD globally in normal client builds.
* Add a public `ComponentOptions.dsd` flag.
* Use a JavaScript evaluator to prerender arbitrary component logic.
* Support `closed` roots and `shadowrootserializable` in v1.
* Bundle a DSD polyfill in the core runtime.

## Consequences

* The browser can parse static shadow structure and scoped styles earlier in
  the page lifecycle.
* Rust codegen must support root adoption before serializer work can safely
  ship.
* The compiler needs a reusable template IR path for both JavaScript codegen
  and HTML serialization.
* Hydration becomes a structural contract with explicit markers and mismatch
  behavior.
* The initial-value evaluator must stay intentionally small and well tested.
* The normal client build remains free of DSD-specific authoring options.
* Older browsers remain supported through JavaScript-required rendering rather
  than a core polyfill.

## Related Milestones

M18, D0, D1, D2, D3, D4, D5
