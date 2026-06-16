# ADR 0006: Signals And Effects Model

Status: Accepted

Weight: P1

## Context

The MVP already uses callable state accessors. Solid, Preact Signals, Angular
Signals, and the TC39 Signals proposal show broad convergence around reactive
state, derived values, and effects, while differing in public API and runtime
details.

## Decision

Adopt a Iktia-owned signal vocabulary:

* `signal<T>()` is the preferred local state primitive.
* `state<T>()` remains a compatibility alias.
* `computed(() => value)` represents pure derived values and is read-only.
* `effect(() => cleanup?)` represents explicit side effects tied to Custom
  Element lifecycle.

The implementation may be inspired by the broader Signals ecosystem, but it
must not depend on a third-party signal runtime.

## Alternatives

* Keep only `state()` and avoid signal vocabulary.
* Re-export Solid or Preact Signals.
* Wait for TC39 Signals before adding a public API.
* Model effects as lifecycle callbacks only.

## Consequences

* The authoring model becomes easier to compare with modern reactive systems.
* The compiler must understand signal, computed, and effect declarations.
* Effects need deterministic mount, update, disconnect, and cleanup behavior.
* Computed values must remain pure to preserve predictable generated output.

## Related Milestones

M10, M11, M12, M16

