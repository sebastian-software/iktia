# MVP Verification Checklist

This checklist records the commands and manual checks expected before declaring
the current compiler MVP healthy.

## Required Commands

Run these commands from the workspace root.

```sh
pnpm install
pnpm build:native
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --workspace
pnpm check-types
pnpm test
pnpm --filter @iktia/example-counter type-check
pnpm --filter @iktia/example-counter build
pnpm --filter @iktia/example-counter test
```

## Expected Coverage

Rust core:

* OXC rejects invalid TSX before transform-specific analysis.
* Function component analysis infers tag name, props, signals, computed values,
  effects, events, host helper usage, options, imports, and the returned TSX
  template.
* Legacy `component()` analysis still extracts tag name, props, state, signals,
  computed values, effects, events, options, and the returned TSX template.
* The OXC AST analyzer owns `.wc` import discovery, component entrypoint
  discovery, local authoring declarations, host helper detection, and return
  template spans.
* Codegen emits native `HTMLElement` classes without a framework runtime.
* Props synchronize with attributes.
* Signal writes update generated text, dynamic attributes, control-flow
  containers, and effects.
* Computed values are generated as read-only derived bindings.
* Effects run after mount/update and clean up on disconnect.
* Events dispatch native `CustomEvent` instances.
* `on()` compiles away to a native `addEventListener()` handler body.
* `host()` / `useHost()` expose a generated lifecycle handle with an
  `AbortSignal`.
* `<Show>` and `<For>` compile as explicit control-flow containers.
* Unsupported JSX `.map()` and conditional expression children produce
  deterministic diagnostics pointing to `<For>` and `<Show>`.
* Shadow DOM rendering supports style injection and slots.
* Generated classes reuse existing declarative shadow roots before any
  `attachShadow()` fallback.
* DSD prerender emits `<template shadowrootmode="open">`, supported initial
  values, scoped styles, slots, and DSD-only `data-iktia-*` hydration markers.
* DSD hydration binds existing nodes, installs event listeners, reports
  development mismatches, and preserves the imperative remount path.
* PascalCase child component JSX rewrites to inferred kebab-case Custom Element
  tags.
* Dynamic `aria-*` values preserve `false` as `"false"`.

TypeScript packages:

* Authoring APIs expose typed function props, signals, computed values, effects,
  DOM event helpers, host helpers, events, component options, and JSX.
* Authoring runtime stubs throw when used without the compiler.
* The Node wrapper exposes a typed native boundary.
* The Node wrapper exposes a typed Declarative Shadow DOM prerender boundary.
* The Vite plugin filters `.wc.tsx` modules, returns transformed code, and can
  emit optional DSD component metadata when prerendering is enabled.

Example app:

* The counter and toggle components build through Vite.
* The compiled elements render inside the browser.
* Clicking the button updates visible text.
* The `change` event carries a numeric detail payload to the host page.
* The toggle fixture exposes primitive `part`, `data-state`, and `aria-pressed`
  contracts.
* The `toggle-change` event carries a boolean detail payload to the host page.
* The generated `dsd.html` page renders Counter and Toggle shadow roots before
  custom-element upgrade.
* Delayed-upgrade browser tests verify DSD content is not cleared and becomes
  interactive after hydration.

## Commit Audit

The implementation history should include at least one Conventional Commit for
each milestone:

* M0: `docs: add compiler milestone plan`
* M1: workspace and toolchain scaffold
* M2: TypeScript authoring interface
* M3: Rust/OXC component analysis
* M4: Custom Element code generation
* M5: typed N-API boundary
* M6: Vite transform plugin
* M7: example app and browser smoke test
* M8: slots and Shadow DOM styling
* M9: documentation and verification checklist
* M10-M16: v2 reactive APIs, control flow, Web composition helpers, primitive
  contracts, and OXC AST analyzer refactor

Use this command to inspect the local sequence:

```sh
git log --oneline --decorate --max-count=20
```

## Release Readiness Gates

Before a public prerelease, add or confirm:

* CI coverage for Linux, macOS, and Windows native builds.
* Published package layout for native binaries.
* Source maps for transformed modules.
* Span-based diagnostics for unsupported syntax.
* Documented CSS strategy for imported styles and Vanilla Extract.
* Fixture coverage for accepted and rejected TSX patterns.
