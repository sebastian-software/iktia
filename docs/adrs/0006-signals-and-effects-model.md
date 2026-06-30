# ADR 0006: Reactive State And Effects Model

Status: Accepted

Weight: P1

## Context

The MVP already uses callable state accessors. Modern reactive systems show
broad convergence around local state, derived values, and effects, while
differing in public API and runtime details.

## Decision

Adopt an Naos-owned reactive vocabulary:

* `state<T>()` is the public local state primitive.
* `computed(() => value)` represents pure derived values and is read-only.
* `effect(() => cleanup?)` represents explicit side effects tied to Custom
  Element lifecycle.

The implementation may use reactive internals, but it must not depend on a
third-party runtime.

## Alternatives

* Re-export a third-party reactive primitive.
* Wait for a future JavaScript standard before adding local state.
* Model effects as lifecycle callbacks only.

## Consequences

* The authoring model remains easy to compare with modern reactive systems.
* The compiler must understand state, computed, and effect declarations.
* Effects need deterministic mount, update, disconnect, and cleanup behavior.
* Computed values must remain pure to preserve predictable generated output.

## Related Milestones

M10, M11, M12, M16
