# ADR 0011: v0.1 Public API Surface

Status: Accepted

Weight: P1

## Context

The MVP intentionally kept early compatibility paths while the compiler proved
its vertical slice. Before v0.1, Naos is still free to reduce that surface to
one public authoring path.

Keeping experimental vocabulary would turn implementation history into a public
compatibility burden.

## Decision

v0.1 keeps one public authoring path:

* exported PascalCase function components;
* destructured function props;
* `state()` for writable local state;
* `computed()` for derived values;
* `effect()` for lifecycle side effects;
* `event()` for typed `CustomEvent` dispatch;
* `on()` for typed DOM event listeners;
* `host()` for host element access;
* `Show` for explicit conditional control flow;
* narrow typed `.map()` list authoring.

`state()` is the public component-state name. Compiler internals may keep signal
or reactive naming, but public docs, examples, diagnostics, and types must use
`state()`.

Event options are split by purpose:

* `event(name, customEventOptions)` controls dispatch.
* `on(type, handler, listenerOptions)` controls listener installation.

## Alternatives

* Keep all experimental aliases as equally supported.
* Prefer a broader reactive vocabulary in the public API.
* Expose multiple host-access helpers.
* Remove `Show` and require JavaScript conditionals.

## Consequences

* v0.1 has a smaller public contract.
* Existing local examples must be migrated before prerelease.
* Unsupported aliases need clear diagnostics while public docs stay focused on
  the stable vocabulary.
* ADR 0006 remains useful for the reactive model and now uses the same public
  state vocabulary.

## Related Milestones

v0.1 M2, M3
