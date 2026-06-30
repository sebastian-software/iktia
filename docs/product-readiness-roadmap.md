# Naos Product Readiness Roadmap

Status: 2026-06-16

This roadmap describes the work needed to move Naos from a strong compiler MVP
to a product-grade public tool. It extends `docs/v0.1-milestone-plan.md` and
`docs/mvp-verification.md`; it does not replace them.

The decision-complete execution plan for the first public prerelease is
[`docs/v0.1-milestone-plan.md`](v0.1-milestone-plan.md). When this roadmap and
the v0.1 plan differ, the v0.1 plan is the implementation source of truth for
that prerelease.

The main sequencing principle is documentation first. Reading and tightening the
docs should expose mismatches in the API, compiler boundary, native packaging,
and demo story before larger implementation work starts.

## Current Baseline

Naos already proves the core vertical slice:

* TypeScript authoring APIs for function components, state, computed values,
  effects, events, host helpers, slots, parts, and explicit control flow.
* Rust/OXC analysis and native Custom Element code generation.
* Declarative Shadow DOM prerendering and hydration.
* A typed N-API boundary exposed through `@naos-ui/compiler`.
* A Vite plugin and a browser-tested counter/toggle example.
* ADRs covering the major compiler and platform decisions.

The remaining MVP signals are mostly feature-depth and hardening issues:

* Native package topology and release automation exist for v0.1, but the first
  public release still needs a real publish dry-run and hosted CI observation.
* CI now covers Rust, Node packages, examples, docs, native builds, release-set
  checks, and browser gates; the next step is tightening failures discovered in
  hosted Actions.
* Diagnostics are structured, but span coverage is still incomplete across all
  rejected syntax paths.
* The demo surface now covers the v0.1 launch proof. Broader interop and forms
  remain post-v0.1 work.

## Internal Reference Patterns To Reuse

### FerroCat

FerroCat is the closest internal reference for Rust release discipline. The
useful patterns are:

* Separate CI jobs for docs, Rust linting, rustdoc warnings, MSRV, platform
  tests, and coverage.
* `cargo fmt --all --check`, Clippy with warnings denied, `cargo doc` with
  `RUSTDOCFLAGS=-D warnings`, and locked Cargo commands.
* Linux coverage with `cargo llvm-cov` and explicit threshold gates.
* Matrix testing on macOS and Windows in addition to Linux coverage.
* Release-Please as the release entry point.
* Publish jobs that run locked tests before publishing and publish crates in
  dependency order.
* A docs site that is built in CI separately from Rust crates.
* Dedicated conformance and benchmark crates for long-term quality signals.
* Dependabot, issue templates, and a pull request template.

### Palamedes

Palamedes is the closest internal reference for the Node/N-API distribution
layer. Naos should adapt these patterns directly:

* One Rust semantic core crate, one Rust `napi-rs` binding crate, one
  platform-aware TypeScript wrapper package, and platform-specific native npm
  packages.
* Workflow-oriented native operations instead of many small helper calls.
* Typed N-API request and response objects instead of JSON as the architectural
  transport boundary.
* Generated TypeScript declarations derived from the N-API binding crate and
  checked in CI.
* A wrapper loader that detects `process.platform`, `process.arch`, and Linux
  libc, then requires the matching optional native package.
* Native packages that are CommonJS packages with a `.node` file as `main`,
  plus `os`, `cpu`, and Linux `libc` metadata.
* Native package build scripts that support release/debug profiles, explicit
  Cargo targets, `cargo-zigbuild` for musl targets, and macOS ad-hoc codesign.
* Release automation that validates the complete package set, publishes native
  packages in a platform matrix with a smoke test, then publishes JavaScript
  packages only after native publishing succeeds.
* Native transform source maps generated in Rust so OXC UTF-8 spans and source
  maps do not drift through JavaScript UTF-16 index translation.

## Strategy

1. Audit and rewrite docs before adding more product surface.
2. Freeze the public API tiers before native package topology is implemented.
3. Adapt Palamedes' native packaging model before broad feature expansion.
4. Build CI and release infrastructure before broad feature expansion.
5. Prove the tool through interop demos, not only unit fixtures.
6. Add conformance, benchmark, and coverage gates once the public contract is
   explicit enough to measure.

## Readiness Milestones

### R1: Documentation-First API Audit

Purpose: Turn the current documentation into a design review. If a feature
cannot be explained clearly, the API or implementation is probably not ready.

Deliverables:

* Review `README.md`, `docs/authoring.md`, `docs/compiler-limitations.md`,
  `docs/declarative-shadow-dom-plan.md`, `docs/demos.md`, and
  `docs/mvp-verification.md` as one user journey.
* Create an API inventory that classifies every public surface as stable,
  legacy-compatible, experimental, or internal.
* Normalize naming around Naos, native interface elements, Custom Elements,
  Declarative Shadow DOM, and the compiler boundary.
* Remove stale previous-name references from docs, scripts, and workflows.
* Convert documentation mismatches into explicit issues or follow-up entries.

Acceptance criteria:

* A new user can read the README and build the example without knowing the
  repository history.
* Every public API mentioned in docs has a stated stability tier.
* Compiler limitations match the actual accepted and rejected syntax.
* `rg -n "l[e]an-wc|L[e]an WC|I[m]bria|TB[D]|TO[D]O|FIX[M]E" README.md docs
  .github packages crates examples scripts` returns no actionable stale
  entries.

### R2: Public API Contract Pass

Purpose: Decide what API shape Naos wants before the binary distribution layer
turns it into a published contract.

Deliverables:

* Write ADRs for API stability tiers and package topology.
* Keep the public authoring API focused on exported PascalCase functions,
  typed function props, `state()`, `computed()`, `effect()`, `event()`, `on()`,
  `host()`, `<Show>`, and keyed `.map()`.
* Freeze the first public shape of `state()`, `computed()`, `effect()`,
  `event()`, `on()`, `host()`, `<Show>`, keyed `.map()`, and
  `ComponentOptions`.
* Decide whether event options belong in `event(name, options)`, `on(type,
  handler, options)`, both, or neither for the first release.
* Define the public DSD API boundary for `renderDeclarativeShadowDom()` and Vite
  prerender metadata.
* Define semver expectations for generated output markers such as
  `data-naos-*`.

Acceptance criteria:

* The public API can be summarized in one reference document without caveats
  that contradict `docs/compiler-limitations.md`.
* Experimental APIs are clearly marked and isolated from stable examples.
* Type tests cover each public authoring primitive.
* ADRs make API trade-offs reviewable before implementation continues.

### R3: FerroCat-Style Repository Hygiene And CI

Purpose: Make every normal contribution prove the same basic health locally and
in GitHub Actions.

Deliverables:

* Add a general CI workflow with jobs for Rust lint, rustdoc, MSRV, Node package
  checks, Rust tests, package tests, example build/tests, and docs checks.
* Add macOS and Windows test matrix jobs for the Rust workspace and native
  binding build.
* Fix the existing Pages workflow to use `@naos-ui/example-counter` and Naos env
  names.
* Add Dependabot, issue templates, and a pull request template.
* Add a coverage job after a realistic Rust baseline is measured.
* Keep all CI commands locked where the repository already has lockfiles.

Acceptance criteria:

* CI catches stale package names, missing native bindings, type failures, Rust
  warnings, and browser demo regressions.
* Local verification and CI use the same command vocabulary where practical.
* The Pages workflow can publish the current demo without manual cleanup.

### R4: Palamedes-Style Native Binary Package Architecture

Purpose: Design multi-native distribution before writing release scripts.

Recommended package topology:

* `@naos-ui/compiler`: pure TypeScript loader, public API, and optional
  dependencies on native packages.
* `@naos-ui/compiler-darwin-arm64`
* `@naos-ui/compiler-darwin-x64`
* `@naos-ui/compiler-linux-arm64-gnu`
* `@naos-ui/compiler-linux-arm64-musl`
* `@naos-ui/compiler-linux-x64-gnu`
* `@naos-ui/compiler-linux-x64-musl`
* `@naos-ui/compiler-win32-arm64-msvc`
* `@naos-ui/compiler-win32-x64-msvc`

Deliverables:

* Write `docs/native-distribution.md` with target triples, package names,
  artifact names, Node version, N-API version, and fallback behavior.
* Write an Naos ADR equivalent to the relevant Palamedes native-boundary ADRs:
  one semantic Rust core, one N-API crate, one platform-aware TS wrapper, and
  platform native packages.
* Confirm that Naos keeps the current coarse workflow boundary:
  `transformComponent()` and `renderDeclarativeShadowDom()` are native workflow
  operations, not collections of small helper calls.
* Define loader resolution order: explicit environment override, installed
  optional package, workspace local binding, then source-build guidance.
* Decide whether source builds are supported during package install or only for
  repository contributors.
* Define how native package versions stay locked to `@naos-ui/compiler`.
* Define the minimum Tier 1 platform set for the first prerelease.
* Define generated native TypeScript declarations from `naos-node` as the
  source of truth for `@naos-ui/compiler` boundary types.

Acceptance criteria:

* A user can understand which package contains the JS API and which package
  contains the native `.node` artifact.
* Missing binary errors tell the user the platform, attempted package names, and
  recovery commands.
* The design handles npm optional dependency behavior across macOS, Linux, and
  Windows.
* The design states that JSON is not the long-term N-API boundary format.

### R5: Multi-Platform Native Binary Implementation

Purpose: Turn the native distribution design into installable packages.

Deliverables:

* Build release-profile N-API artifacts for the agreed target matrix.
* Generate or maintain platform package manifests with correct `os`, `cpu`,
  Linux `libc`, `main`, `files`, `engines`, `publishConfig`, and license
  metadata.
* Use CommonJS native packages whose `main` points directly at
  `./naos-node.node`.
* Add an Naos equivalent of Palamedes' native package build script with:
  debug/release profile selection, optional Cargo target override, optional
  Cargo subcommand override, musl support through `cargo-zigbuild`, and macOS
  ad-hoc codesigning.
* Replace the single hard-coded native path with the loader resolution strategy.
* Detect Linux libc through `process.report.getReport()` and choose GNU or musl
  native packages accordingly.
* Generate `@naos-ui/compiler` TypeScript boundary types from `crates/naos-node`
  via `napi-rs` type metadata, commit the generated file, and add a
  `check-native-types` command.
* Add tests for successful loading, missing binary errors, explicit native path
  overrides, and local workspace fallback.
* Upload native artifacts from CI before publish jobs consume them.

Acceptance criteria:

* `@naos-ui/compiler` works from an installed package on each Tier 1 platform
  without requiring a Rust toolchain.
* Repository development still supports `pnpm build:native`.
* The native binding exposes version metadata that can be checked against the JS
  package version.
* Native loader tests cover unsupported platform messages and missing optional
  dependency messages.

### R6: Release Automation

Purpose: Make public prereleases repeatable and auditable.

Deliverables:

* Add Release-Please configuration for the pnpm workspace and native platform
  packages.
* Add a release-set checker like Palamedes' `check-release-set.mjs` so all
  public package versions, release metadata, Cargo manifests, Cargo lockfile
  entries, publish workflow filters, and native matrix entries stay aligned.
* Add npm publish jobs with provenance and a dry-run mode.
* Publish native packages first in a platform matrix, smoke-test the generated
  `.node` artifact on each runner, then publish JavaScript packages.
* Add GitHub release artifact uploads for native binaries if they are useful for
  debugging or non-npm consumers.
* Decide whether `naos-core` is published to crates.io immediately or kept
  repository-internal until the Rust API is stable.
* Keep `naos-node` unpublished as a crate unless there is a direct Rust use
  case for the Node binding.
* Add package-level changelogs if Release-Please needs them for clean release
  notes.

Acceptance criteria:

* A release PR shows all package version changes and changelog entries.
* Publish jobs run tests before publishing and stop on version skew.
* A failed native package publish cannot silently produce a broken JS package.
* The JS wrapper package is not published until all required Tier 1 native
  packages have built, smoke-tested, and published.

### R7: Compiler Diagnostics And Source Maps

Purpose: Make compiler failures feel intentional instead of MVP-shaped.

Deliverables:

* Introduce structured diagnostic types with severity, code, message, filename,
  span, and hint.
* Use OXC spans for supported semantic errors wherever possible.
* Add source maps for transformed modules in the Rust transform workflow.
* Preserve UTF-8/OXC span correctness instead of translating spans in the JS
  wrapper.
* Follow the Palamedes source-map model: the native transform owns final code
  and source map output because OXC spans are UTF-8 byte offsets.
* Add fixture coverage for each accepted and rejected syntax path.
* Update Vite errors to surface diagnostic codes and source locations.

Acceptance criteria:

* Unsupported JSX patterns point to the relevant source range and recommended
  Naos construct.
* Vite users see actionable errors without opening generated output.
* Source maps make browser stack traces refer back to `.wc.tsx` modules.

### R8: Generated Output And Runtime Contract Hardening

Purpose: Treat generated Custom Elements as a public product surface.

Deliverables:

* Document the generated element contract: tag inference, attributes, props,
  events, slots, parts, `data-naos-*` markers, and DSD hydration behavior.
* Add snapshot or golden tests for generated output where output stability
  matters.
* Add browser tests for event payloads, attribute reflection, DSD delayed
  upgrade, and `aria-*` behavior.
* Decide which generated details are semver-protected and which remain internal.

Acceptance criteria:

* Demo components can be embedded into a host page with documented attributes,
  events, slots, and parts.
* Hydration markers are either documented as stable or explicitly internal.
* Contract tests catch accidental output drift.

### R9: Docs Site And Guided Learning Path

Purpose: Replace scattered markdown reading with a product-grade learning path.

Status: A first Ardo docs site exists in `sites/docs`, builds in CI, and is
deployed as the root of the GitHub Pages artifact. Further work should deepen
the learning path rather than create the site from scratch.

Deliverables:

* Extend the Ardo docs site that builds in CI, inspired by FerroCat's separate
  docs build.
* Start with a small information architecture: Introduction, Quickstart,
  Authoring, Compiler Limits, DSD, Vite, Native Distribution, API Reference,
  Demos, Troubleshooting.
* Keep source-of-truth docs in markdown and avoid duplicating API statements.
* Publish docs and demos through GitHub Pages or a single static deployment.

Acceptance criteria:

* A first-time reader can reach a working component in under ten minutes.
* The native binding and platform package story is documented before the first
  public prerelease.
* The docs site build is part of CI and Pages deployment.

### R10: Demo And Interop Suite

Purpose: Prove that Naos outputs native elements that work as static,
framework-free interface units before expanding into broader host-framework
interop.

Status: The v0.1 static demo set exists under `examples/counter` and is copied
under `/demos/` in the Pages artifact. It covers Vite build output, DSD,
delayed hydration, state, events, slots/parts, and CSS variables.

Deliverables:

* Keep the counter/toggle demo as the minimal smoke path.
* Add a design-system primitive demo with parts, slots, `data-state`, and
  typed events.
* Add linked static demo pages for static/DSD output, Vite build, delayed
  hydration, state, events, slots/parts, and CSS variables.
* Add Playwright tests that exercise compiled elements from host pages rather
  than only package-level tests.
* Keep React, Vue, and Angular host demos out of the v0.1 launch-proof path.
  They may become a later interoperability appendix if product positioning
  needs them.

Acceptance criteria:

* Demos show why native Custom Elements are the output target.
* Static demo pages consume Naos elements through DOM APIs, not framework
  adapters.
* Demo tests run in CI and fail on broken bundling, events, or hydration.

### R11: Product-Grade Feature Completion

Purpose: Add the features that make the tool feel useful beyond counter demos,
after API and release foundations are stable.

Candidate feature groups:

* Form-associated Custom Elements and form lifecycle APIs.
* Event option code generation.
* Keyed `.map()` diffing or an explicitly documented re-render list contract.
* CSS import strategy for Shadow DOM, including how far Vite integration goes.
* Component module graph analysis beyond direct `.wc` imports.
* Vite cache invalidation and better dev-server diagnostics.
* More complete style, part, slot, and accessibility examples.

Acceptance criteria:

* Each feature group has its own ADR or focused design document before broad
  implementation.
* Features are added only when the docs can describe the user model clearly.
* No feature expands the runtime into a framework, virtual DOM, or React/Solid
  compatibility layer.

### R12: Conformance, Benchmarks, And Release Candidate

Purpose: Define the quality bar for a credible public prerelease.

Deliverables:

* Add an `naos-conformance` test area or crate for accepted/rejected syntax
  fixtures and generated output contracts.
* Add an `naos-bench` area or crate for transform performance and selected
  generated-output benchmarks.
* Define benchmark budgets for representative component sizes.
* Add a release-candidate checklist that combines CI, docs, demos, package
  install tests, and manual browser checks.

Acceptance criteria:

* The release candidate can be installed into a fresh project on each Tier 1
  platform.
* Conformance fixtures cover the documented public syntax boundary.
* Benchmarks give enough trend data to catch major transform regressions.

## Suggested Sequence

1. R1 and R2: documentation and API decisions.
2. R3: repository hygiene and CI, including the existing Pages workflow cleanup.
3. R4 and R5: Palamedes-style native package design and multi-platform
   implementation.
4. R6: release automation once packages can be installed from artifacts.
5. R7 and R8: diagnostics, source maps, and output contract hardening.
6. R9 and R10: docs site and interop demos.
7. R11 and R12: larger product features, conformance, benchmarks, and release
   candidate gates.

This sequence intentionally puts release mechanics before broad feature
expansion. Naos already has enough compiler capability to reveal packaging,
documentation, and API-contract problems.

## Resolved v0.1 Decisions

The v0.1 planning interview resolved the previously open API and release
questions. The accepted decisions are recorded in
[`docs/v0.1-milestone-plan.md`](v0.1-milestone-plan.md) and ADRs 0011-0016:

* `state()` is the public writable local state primitive.
* `event()` owns `CustomEvent` options; `on()` owns listener options.
* Native distribution uses the full Palamedes-style Tier 1 matrix.
* Source builds are contributor-only, not npm install fallbacks.
* `data-naos-*` markers are internal generated markup.
* Rust crates remain unpublished to crates.io for v0.1.
* v0.1 demos are linked static Naos demos, not a React/Vue/Angular host
  matrix.

## Commit Discipline

Keep future work modular and reviewable:

* `docs:` for API inventories, ADRs, roadmap updates, and docs-site content.
* `ci:` for GitHub Actions, Dependabot, templates, and coverage gates.
* `build:` for native artifact generation, package manifests, and publish
  wiring.
* `feat:` for compiler, API, Vite, and runtime capabilities.
* `test:` for fixtures, conformance, browser tests, and install tests.

The first commit from this roadmap should only add this planning document. Each
future milestone should land as one or more focused commits with verification
noted in the commit body or pull request description.
