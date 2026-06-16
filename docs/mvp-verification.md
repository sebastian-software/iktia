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
pnpm --filter @lean-wc/example-counter type-check
pnpm --filter @lean-wc/example-counter build
pnpm --filter @lean-wc/example-counter test
```

## Expected Coverage

Rust core:

* OXC rejects invalid TSX before transform-specific analysis.
* Function component analysis infers tag name, props, state, events, options,
  imports, and the returned TSX template.
* Legacy `component()` analysis still extracts tag name, props, state, events,
  options, and the returned TSX template.
* Codegen emits native `HTMLElement` classes without a framework runtime.
* Props synchronize with attributes.
* State writes update generated text and dynamic attributes.
* Events dispatch native `CustomEvent` instances.
* Shadow DOM rendering supports style injection and slots.
* PascalCase child component JSX rewrites to inferred kebab-case Custom Element
  tags.

TypeScript packages:

* Authoring APIs expose typed function props, state, events, component options,
  and JSX.
* Authoring runtime stubs throw when used without the compiler.
* The Node wrapper exposes a typed native boundary.
* The Vite plugin filters `.wc.tsx` modules and returns transformed code.

Example app:

* The counter component builds through Vite.
* The compiled element renders inside the browser.
* Clicking the button updates visible text.
* The `change` event carries a numeric detail payload to the host page.

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
