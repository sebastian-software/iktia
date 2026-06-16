# Architecture Decision Records

This directory records major Iktia architecture decisions in English. ADRs are
sorted by architectural weight so foundational constraints are easier to review
than chronological trivia.

## Weight Scale

* **P0**: foundational decisions that constrain the whole project.
* **P1**: major API or compiler direction.
* **P2**: conventions and implementation guidance.

## Weighted Index

### P0: Foundational Decisions

* [ADR 0001: Platform-Native Web Components](0001-platform-native-web-components.md)
* [ADR 0002: Rust-Owned Compiler Semantics](0002-rust-owned-compiler-semantics.md)
* [ADR 0003: TypeScript Authoring Boundary](0003-typescript-authoring-boundary.md)
* [ADR 0004: No Framework Runtime](0004-no-framework-runtime.md)
* [ADR 0005: Static Analyzability Over JavaScript Generalism](0005-static-analyzability-over-js-generalism.md)

### P1: Major API And Compiler Direction

* [ADR 0006: Signals And Effects Model](0006-signals-and-effects-model.md)
* [ADR 0007: Remix v3 Web Composition Inspiration](0007-remix-v3-web-composition-inspiration.md)
* [ADR 0009: OXC AST Analysis Before API Expansion](0009-oxc-ast-analysis-before-api-expansion.md)
* [ADR 0010: Declarative Shadow DOM Output And Hydration](0010-declarative-shadow-dom-output-and-hydration.md)

### P2: Conventions And Implementation Guidance

* [ADR 0008: Primitive Contracts With Parts, Slots, And Data State](0008-primitive-contracts-parts-slots-data-state.md)

## ADR Template

Each ADR uses this structure:

* Status
* Weight
* Context
* Decision
* Alternatives
* Consequences
* Related Milestones

## Maintenance Rules

* Add ADRs for decisions that change public authoring, generated output,
  compiler architecture, or dependency/runtime policy.
* Do not add ADRs for routine implementation details unless they create a
  durable constraint.
* Keep decisions in English and link each ADR to the relevant milestone.
