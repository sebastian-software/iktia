# Iktia Milestone Plan v2

Status: 2026-06-16

This document extends the MVP plan in `docs/milestones.md`. The v1 plan remains
historical planning material. This v2 roadmap describes the next architecture
layer: signals, computed values, effects, compile-time control flow,
Remix-v3-inspired Web composition, primitive contracts, OXC AST analysis, and
weighted architecture decision records.

The project language is English. All public APIs, diagnostics, examples, ADRs,
and implementation documentation introduced by this roadmap must be written in
English.

## Strategy

The v2 strategy is layered:

1. Stabilize the reactive authoring vocabulary with `signal()` and
   `computed()`.
2. Add `effect()` only after lifecycle and cleanup semantics are explicit.
3. Add compile-time control flow instead of accepting arbitrary JavaScript
   rendering patterns.
4. Adapt Remix v3 as design inspiration for Web APIs, composition, dependency
   restraint, and cohesive distribution without adopting Remix as a runtime.
5. Record major architecture decisions in weighted ADRs so future implementation
   work can be reviewed against explicit principles.

The output remains native Custom Elements. The project must not ship React,
Solid, Remix, Preact, Lit, Stencil, or a virtual DOM renderer as its component
runtime.

## Inspiration Sources

This roadmap cites ideas from these primary or project-owned references:

* [Solid `createSignal`](https://docs.solidjs.com/reference/basic-reactivity/create-signal)
* [Solid `createMemo`](https://docs.solidjs.com/reference/basic-reactivity/create-memo)
* [Solid `createEffect`](https://docs.solidjs.com/reference/basic-reactivity/create-effect)
* [Solid `<Show>`](https://docs.solidjs.com/reference/components/show)
* [Preact Signals](https://preactjs.com/guide/v10/signals/)
* [TC39 Signals proposal](https://github.com/tc39/proposal-signals)
* [Wake up, Remix!](https://remix.run/blog/wake-up-remix)
* [Remix 3 repository](https://github.com/remix-run/remix)
* [Remix homepage](https://remix.run/)

These sources are inspirations, not dependencies. The implementation must
translate useful concepts into a compiler-owned Web Component model.

## M10: Signals API

### Purpose

Introduce `signal<T>()` as the preferred state primitive while keeping
`state<T>()` as a compatibility alias. The authoring model should keep the
current accessor ergonomics: `count()` reads, `.set()` and `.update()` write.

### Scope

* Add `signal<T>(initialValue)` to the TypeScript authoring API.
* Keep `state<T>()` as an alias or legacy API with identical type shape.
* Preserve the current `WritableAccessor<T>` contract.
* Extend type tests to prove read, set, and update behavior.
* Update examples and docs to prefer `signal()` when v2 implementation begins.

### Out of Scope

* Automatic dependency graph scheduling.
* `computed()`.
* Effects.
* Runtime signal interoperability with TC39, Preact, Solid, or Angular signal
  implementations.

### Acceptance Criteria

* `signal(0)` returns a callable accessor with `.set()` and `.update()`.
* TypeScript rejects writes with incompatible value types.
* Existing `state()` examples continue to typecheck.
* Generated Custom Element output remains framework-free.

### Verification

```sh
pnpm check-types
pnpm test
cargo test --workspace
```

### Planned Commits

* `feat: add signal authoring api`
* `test: add signal type tests`

## M11: Computed Values

### Purpose

Introduce `computed(() => value)` for pure derived values. Computed accessors
should be read-only and usable in text, attributes, event handlers, and later
control-flow expressions.

### Scope

* Add `computed<T>(derive: () => T): Accessor<T>` to TypeScript authoring
  types.
* Extend the compiler model to detect computed declarations.
* Generate derived binding code that evaluates after source signals and before
  DOM updates.
* Reject `.set()` and `.update()` on computed values at type level.
* Add Rust fixtures for computed reads in text and dynamic attributes.

### Out of Scope

* Writable computed values.
* Async computed values.
* Equality customization.
* User-supplied dependency arrays.

### Acceptance Criteria

* `computed(() => count() * 2)` can be read as `doubleCount()`.
* Computed values are unavailable as mutation targets.
* DOM bindings that read computed values update when source signals update.
* Computed functions are documented as pure.

### Verification

```sh
cargo test --workspace
pnpm check-types
pnpm test
```

### Planned Commits

* `feat: add computed authoring api`
* `feat: analyze computed dependencies`
* `test: add computed binding fixtures`

## M12: Effect Lifecycle

### Purpose

Add `effect()` for explicit side effects with lifecycle cleanup. Effects are
interesting, but they can easily become an unbounded runtime feature. The MVP
must make mount, update, disconnect, and cleanup behavior explicit.

### Scope

* Add `effect(callback)` to authoring types.
* Callback return type is `void | (() => void)`.
* Generated code runs effects after initial mount.
* Cleanup runs before the next effect execution and when the Custom Element
  disconnects.
* Effects may read signals, computed values, props, and host handles when those
  features are available.
* Add browser smoke coverage for disconnect cleanup.

### Out of Scope

* Effects during SSR.
* Async tracking through awaited code.
* Arbitrary scheduler customization.
* Dependency arrays.

### Acceptance Criteria

* Effects run after DOM nodes are created.
* Cleanup runs on disconnect.
* Multiple signal writes in one handler do not produce duplicate DOM or effect
  work beyond the current scheduler model.
* Unsupported effect shapes fail with clear diagnostics.

### Verification

```sh
cargo test --workspace
pnpm check-types
pnpm --filter @iktia/example-counter test
```

### Planned Commits

* `feat: add effect lifecycle api`
* `test: add effect cleanup fixtures`

## M13: Compile-Time Control Flow

### Purpose

Add explicit control-flow constructs rather than accepting arbitrary JSX
JavaScript patterns. This follows the spirit of Solid's `<Show>` and `<For>`
while keeping Iktia compiler-owned and statically analyzable.

### Scope

* Add typed `<Show when={...} fallback={...}>...</Show>`.
* Add typed `<For each={items()}>{(item) => ...}</For>`.
* Represent control flow in the Rust IR.
* Generate DOM anchors and update code for conditionals and lists.
* Reject arbitrary `items.map()` in JSX until a safe compilation model exists.

### Out of Scope

* Full JSX expression generality.
* Keyed diffing beyond the first accepted MVP list strategy.
* Suspense or async boundaries.
* Fragment support unless required by the control-flow implementation.

### Acceptance Criteria

* `<Show>` toggles DOM content without rebuilding the host element.
* `<For>` renders a list from a signal or computed accessor.
* Unsupported map/conditional patterns emit explicit diagnostics.
* Type tests cover accepted and rejected control-flow props.

### Verification

```sh
cargo test --workspace
pnpm check-types
pnpm test
```

### Planned Commits

* `feat: add show control flow`
* `feat: add for control flow`
* `test: add control flow fixtures`

## M14: Remix-v3-Inspired Web Composition

### Purpose

Adapt Remix v3's useful design ideals without adopting Remix. The relevant
ideas are Web APIs first, dependency restraint, single-purpose composition,
cohesive distribution, model-friendly source, and DOM-native event/lifecycle
semantics.

### Scope

* Explore `on(type, handler)` as a typed event helper for DOM event
  composition.
* Explore `host()` or `useHost()` for controlled access to the host element,
  update scheduling, and lifecycle abort signal.
* Prefer `EventTarget`, `AbortSignal`, `CustomEvent`, `Request`, `Response`,
  `Headers`, and platform DOM types over project-specific abstractions where
  practical.
* Keep helpers usable independently from the compiler where possible.
* Document the deliberate disagreement with Remix v3's "religiously runtime"
  principle: Iktia is intentionally compiler-first for Web Component output.

### Out of Scope

* A full-stack framework.
* Routing, data loading, server APIs, auth, sessions, or database packages.
* Remix package compatibility.
* A Remix UI clone.

### Acceptance Criteria

* Composition helpers use Web platform types in their public TypeScript
  signatures.
* Event helpers preserve typed event details where possible.
* Host access is lifecycle-safe and cleans up through `AbortSignal`.
* Documentation explains which Remix v3 ideas are adopted and which are not.

### Verification

```sh
pnpm check-types
pnpm test
cargo test --workspace
```

### Planned Commits

* `feat: add typed dom event helper`
* `feat: add host lifecycle handle`
* `docs: document web composition conventions`

## M15: Primitive Contracts

### Purpose

Define the styling and accessibility contracts expected from Iktia primitive
components. This is not a UI kit milestone. It establishes conventions that
make generated Web Components inspectable, styleable, and composable.

### Scope

* Document recommended use of `part`, named slots, `data-state`,
  `data-disabled`, `data-orientation`, and `aria-*`.
* Add one small Toggle fixture to prove state attributes, ARIA attributes,
  parts, and slots work together.
* Include accessibility-oriented acceptance criteria for primitive fixtures.
* Keep conventions platform-native and framework-neutral.

### Out of Scope

* A full component library.
* Theme tokens.
* Portals, focus traps, overlays, or complex interaction primitives.
* Radix or Reach UI compatibility.

### Acceptance Criteria

* A Toggle fixture exposes stable `part`, `slot`, `data-state`, and ARIA
  contracts.
* Docs describe naming conventions for primitive parts and states.
* Browser smoke tests verify visible state and host attributes.

### Verification

```sh
pnpm --filter @iktia/example-counter test
pnpm check-types
cargo test --workspace
```

### Planned Commits

* `docs: add primitive authoring conventions`
* `test: add toggle primitive fixture`

## M16: AST Analyzer Refactor

### Purpose

Replace MVP regex/string extraction with OXC AST-driven semantic analysis. This
is required before the API surface becomes too broad and before diagnostics need
to be trusted by users.

### Scope

* Introduce a component AST analyzer module in `iktia-core`.
* Preserve existing accepted fixtures during the refactor.
* Add rejected syntax fixtures for unsupported patterns.
* Capture stable spans for future diagnostics and source maps.
* Keep public transform and N-API request/response shapes stable.

### Out of Scope

* Source maps themselves, unless span capture makes a narrow source-map slice
  cheap.
* Full TypeScript typechecker integration.
* Cross-file semantic analysis beyond direct `.wc` import metadata.

### Acceptance Criteria

* Existing examples and tests pass through the AST analyzer path.
* Function components, legacy `component()`, signals, computed values, effects,
  and control flow all have AST-backed fixtures.
* Unsupported patterns produce deterministic diagnostics.
* The old extraction path is removed or isolated behind explicit test-only
  compatibility.

### Verification

```sh
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --workspace
pnpm check-types
pnpm test
```

### Planned Commits

* `refactor: introduce component ast analyzer`
* `test: add accepted and rejected syntax fixtures`

## M17: Weighted Architecture Decision Records

### Purpose

Record the project's design ideals and major decisions as English ADRs sorted
by architectural weight. This makes the reasoning behind the project durable
and reviewable before implementation pressure blurs tradeoffs.

ADR index: [docs/adrs/README.md](adrs/README.md)

### Scope

* Add `docs/adrs/README.md` as the weighted decision index.
* Add the initial ADR set:
  * `0001-platform-native-web-components.md`
  * `0002-rust-owned-compiler-semantics.md`
  * `0003-typescript-authoring-boundary.md`
  * `0004-no-framework-runtime.md`
  * `0005-static-analyzability-over-js-generalism.md`
  * `0006-signals-and-effects-model.md`
  * `0007-remix-v3-web-composition-inspiration.md`
  * `0008-primitive-contracts-parts-slots-data-state.md`
  * `0009-oxc-ast-analysis-before-api-expansion.md`
* Each ADR includes Status, Weight, Context, Decision, Alternatives,
  Consequences, and Related Milestones.
* Weights are:
  * P0: foundational decisions that constrain the whole project.
  * P1: major API or compiler direction.
  * P2: conventions and implementation guidance.

### Out of Scope

* Rewriting `docs/milestones.md`.
* Recording every small implementation choice as an ADR.
* Translating historical German planning notes.

### Acceptance Criteria

* ADR index lists all ADRs grouped by P0, P1, and P2.
* Every ADR has a weight and related milestone.
* ADRs have no placeholder sections.
* The v2 roadmap links to the ADR index.

### Verification

```sh
rg -n "TO""DO|TB""D|FIX""ME|PLACE""HOLDER" docs README.md
rg -n "^Weight:" docs/adrs
rg -n "^## Related Milestones" docs/adrs
```

### Planned Commits

* `docs: add weighted architecture decision records`

## V2 Completion Criteria

V2 is complete when:

* `signal()` is the documented preferred local state primitive.
* `computed()` supports pure derived values in generated DOM bindings.
* `effect()` has deterministic lifecycle and cleanup semantics.
* `<Show>` and `<For>` are supported through explicit compiler constructs.
* Web composition helpers use platform types and lifecycle-safe cleanup.
* Primitive contracts are documented and covered by at least one fixture.
* OXC AST analysis is the primary semantic path.
* Weighted ADRs explain the design ideals and major decisions behind the
  project.

## Post-v2 Research Queue

The next planning layer should evaluate form and lifecycle ideas inspired by
React 19 and React 19.2 without adopting React as a runtime. The current review
is documented in [docs/react-19-adaptation.md](react-19-adaptation.md).
Declarative Shadow DOM should be implemented ahead of that broader form work
because it affects the generated Shadow DOM lifecycle, hydration strategy, demo
publishing, and future form-associated custom element output. The finalized DSD
plan is documented in
[docs/declarative-shadow-dom-plan.md](declarative-shadow-dom-plan.md), with the
accepted architecture decision in
[ADR 0010](adrs/0010-declarative-shadow-dom-output-and-hydration.md).

Candidate follow-up milestones:

* M18: Declarative Shadow DOM Root Adoption And Hydration
* M19: Native Form Actions
* M20: Form Status And Submit Primitives
* M21: Optimistic Actions
* M22: Form-Associated Custom Elements
