# lean-wc

Rust/OXC-powered TSX compilation for native Web Components.

`lean-wc` is an experimental compiler for teams that want the authoring comfort
of typed TSX without shipping a framework runtime, virtual DOM, or React
compatibility layer. You write a small, statically analyzable `.wc.tsx` file.
The Vite plugin sends it through a typed Node wrapper into a Rust compiler core,
and the output is a native `HTMLElement` class.

```tsx
import { computed, event, on, signal, type ComponentOptions } from "lean-wc"

export type CounterProps = {
  label?: string
}

export const options = {
  shadow: true,
} satisfies ComponentOptions

export function Counter({ label = "Count" }: CounterProps = {}) {
  const count = signal(0)
  const text = computed(() => `${label}: ${count()}`)
  const change = event<number>("change")

  return (
    <button
      part="button"
      data-count={count()}
      onClick={on("click", () => {
        count.set(count() + 1)
        change.emit(count())
      })}
    >
      {text()}
    </button>
  )
}
```

The generated module defines a Custom Element, synchronizes props and
attributes, updates text and dynamic attributes, dispatches native
`CustomEvent`s, and can render into Shadow DOM with styles and slots.

## Status

This repository is an MVP and compiler architecture spike, not a production
release. The current implementation proves the vertical slice:

* typed TypeScript authoring API and JSX surface
* PascalCase function component authoring with kebab-case Custom Element output
* `signal()`, `computed()`, and `effect()` authoring primitives
* explicit `<Show>` and `<For>` compile-time control flow
* Rust/OXC TSX parse validation and compiler analysis
* native Custom Element code generation
* typed N-API boundary and Node wrapper
* Vite transform plugin
* counter example with Playwright browser smoke test
* Shadow DOM style injection and default/named slots

See [docs/compiler-limitations.md](docs/compiler-limitations.md) for the current
accepted syntax boundary.

## Why This Exists

Web Components are the browser platform's reusable component primitive. The
ecosystem already has mature ways to build them: runtime libraries, framework
adapters, full compilers, and design-system toolkits. `lean-wc` explores a
specific point in that landscape:

* Rust owns compiler semantics.
* TypeScript owns authoring types, package ergonomics, and Vite integration.
* The browser receives native Custom Elements.
* The component model stays deliberately small and statically analyzable.

The bet is that a narrow compiler can give design-system and embedded-widget
teams a useful middle ground: more structure than hand-written Custom Elements,
less runtime surface than framework-backed wrappers.

## Good Fit

`lean-wc` is aimed at:

* design-system packages that need framework-neutral output
* embedded widgets that should not bring an app framework with them
* multi-framework product surfaces where Custom Elements are the stable
  integration contract
* teams that want strong TypeScript authoring types but prefer compiler-owned
  runtime semantics
* experiments in Rust-based frontend tooling built on OXC

It is not trying to be:

* a React compatibility layer
* a Solid runtime
* a general application framework
* a virtual DOM renderer
* a drop-in replacement for Lit, Stencil, Svelte, Vue, or Angular

## Quick Start

Install dependencies from the workspace root.

```sh
pnpm install
pnpm build:native
```

Configure TypeScript for the automatic JSX runtime.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "lean-wc"
  }
}
```

Add the Vite plugin.

```ts
import { defineConfig } from "vite"
import leanWebComponents from "lean-wc/vite"

export default defineConfig({
  plugins: [leanWebComponents()],
})
```

Create a `.wc.tsx` file and import it from your app.

```ts
import "./counter.wc.tsx"
```

Run the example.

```sh
pnpm --filter @lean-wc/example-counter build
pnpm --filter @lean-wc/example-counter test
```

The demo site is designed as a small public proof surface. It currently covers
reactive state, primitive contracts, and PascalCase component composition, and
is published through GitHub Pages from the `main` branch. See
[docs/demos.md](docs/demos.md) for the demo matrix, local commands, and Pages
workflow details.

## Authoring Model

Exported PascalCase functions are the preferred component declaration form. The
TypeScript name is the authoring contract; the native Custom Element tag is a
compiler detail. `Counter` compiles to `x-counter`, while multi-word names such
as `CounterButton` compile to `counter-button`.

```tsx
import { Show, computed, event, on, signal, type ComponentOptions } from "lean-wc"

export type ButtonProps = {
  label?: string
}

export const options = {
  shadow: true,
  define: true,
  styles: [":host { display: inline-block; }"],
} satisfies ComponentOptions

export function Button({ label = "Save" }: ButtonProps = {}) {
  const pressed = signal(false)
  const stateLabel = computed(() => (pressed() ? "Pressed" : "Idle"))
  const submit = event<{ label: string }>("submit")

  return (
    <button
      part="root control"
      data-state={pressed() ? "on" : "off"}
      aria-pressed={pressed()}
      onClick={on("click", () => {
        pressed.set(true)
        submit.emit({ label })
      })}
    >
      <slot name="icon" />
      {label}
      <Show when={pressed()} fallback={<span part="indicator">Idle</span>}>
        <span part="indicator">{stateLabel()}</span>
      </Show>
    </button>
  )
}
```

PascalCase components can be nested without caring about the native tag name.
The compiler rewrites the JSX tag and keeps `.wc` imports as side-effect imports
so the nested element is registered.

```tsx
import { Button } from "./button.wc.tsx"

export function Toolbar() {
  return <Button label="Save" />
}
```

Current APIs:

* exported PascalCase functions with typed props
* `export const options satisfies ComponentOptions`
* `signal(initialValue)` for writable local state
* `computed(() => value)` for read-only derived values
* `effect(() => cleanup?)` for lifecycle side effects
* `event<Detail>(name)`
* `on(name, handler)` for typed DOM event composition
* `host()` / `useHost()` for element, root, update, and abort-signal access
* `<Show>` and `<For>` as explicit compile-time control flow
* typed JSX intrinsic elements and common DOM/event attributes
* legacy `component(tagName, options?, render)` and `prop.*()` accessors

For details, see [docs/authoring.md](docs/authoring.md).

## Architecture

```text
.wc.tsx source
  -> Vite plugin filter
  -> @lean-wc/core-node typed wrapper
  -> lean-wc-node N-API module
  -> lean-wc-core Rust compiler
  -> OXC TSX parse validation
  -> component analysis and code generation
  -> native Custom Element JavaScript
```

The TypeScript package is intentionally thin. It provides types, authoring
stubs, runtime helpers, and Vite integration. The Rust crates own parsing,
analysis, and output decisions.

## Landscape

This section is a product-positioning snapshot from June 2026. It is meant to
explain where `lean-wc` fits, not to rank mature projects against an MVP.

| Tool or category | Authoring model | Runtime or output model | Strong fit | How `lean-wc` differs |
| --- | --- | --- | --- | --- |
| Native Custom Elements | JavaScript classes extending `HTMLElement` | Browser-native Custom Elements | Maximum platform control and minimum dependency surface | Adds typed TSX authoring and compiler-generated boilerplate |
| Lit | `LitElement`, reactive properties, tagged template literals | Lightweight Lit runtime and reactive update cycle | Mature web component libraries with broad docs and ecosystem | Avoids a template/runtime library and compiles a narrow TSX subset to direct DOM code |
| Stencil | TypeScript, JSX, and CSS compiler for Web Components | Compiler-generated Custom Elements | Production component libraries that need a complete Web Component compiler toolchain | Closest category neighbor, but `lean-wc` is Rust/OXC-first and intentionally smaller |
| FAST | Web Component libraries and design-system foundation | FAST element/runtime model and component packages | Design systems aligned with FAST/Fluent patterns | Does not provide a design system or runtime foundation package |
| Svelte custom elements | Svelte components compiled behind a Custom Element wrapper | Svelte component lifecycle wrapped as a custom element | Teams already building in Svelte that need custom-element distribution | The source component is the Custom Element contract itself, not a wrapped framework component |
| Vue custom elements | Vue component APIs through `defineCustomElement()` | Native Custom Element constructor backed by Vue's component model | Vue teams publishing embeddable components | Does not bring Vue's component/runtime model into the element |
| Angular Elements | Angular components packaged as Custom Elements | Angular component model exposed through Custom Elements | Angular organizations integrating with non-Angular hosts | Not an adapter for a full application framework |
| Atomico | Function and hooks style authoring for Web Components | Small library with hooks and virtual DOM concepts | React-like function authoring for Web Components | Keeps the authoring API compile-time only and avoids a client-side virtual DOM |
| Hybrids | Declarative object and functional component model | Framework API over Web Components | Functional/declarative Web Component applications and libraries | Uses Rust compiler analysis instead of a runtime object model |
| Preact custom element wrappers | Preact component registered as a custom element | Preact runtime wrapped behind Custom Elements | Preact teams needing simple Custom Element interop | Does not wrap a Preact component or runtime |
| Solid custom elements | Solid integration for Custom Web Components | Solid primitives exposed through Custom Elements | Solid teams that want custom-element distribution | Solid-inspired ergonomics without depending on Solid runtime semantics |
| Mitosis | JSX source compiled to many frameworks | Framework-specific generated outputs | Design systems that must target React, Vue, Svelte, Angular, Solid, Qwik, and more | Targets one output deliberately: native Custom Elements |

The most direct comparison is Stencil because it is also a Web Component
compiler with TSX authoring. The strategic distinction is scope. Stencil is a
complete, established compiler ecosystem. `lean-wc` is a focused experiment in
whether Rust/OXC can provide a smaller compiler core with a typed TypeScript
authoring boundary and no framework runtime goal.

## Technical Relatives

The JavaScript tooling direction matters here. OXC, SWC, Rolldown, and esbuild
show that high-performance native tooling is now normal in frontend pipelines.
`lean-wc` follows that direction, but it is not a general bundler or TypeScript
transpiler. Its job is narrower: analyze a constrained component authoring
format and emit native Custom Element modules.

OXC is the parser and analysis foundation used by the Rust core. The Vite
integration stays thin so the project can benefit from existing bundler
infrastructure instead of becoming a bundler itself.

## Current Limitations

The MVP accepts a deliberately small TSX subset:

* one exported PascalCase function component or one legacy `component()` call
  per transformed module
* deterministic native tag inference from the PascalCase function name
* destructured function props with defaults
* arrow function callback with a block body for legacy `component()` syntax
* `return (...)` around the TSX template
* `const` authoring declarations for signals, computed values, effects, and
  events
* one root TSX element
* static attributes, dynamic attributes, text interpolation, event handlers,
  PascalCase child components, explicit `<Show>` / `<For>` control flow, slots,
  and inline style strings

Unsupported today:

* fragments and multiple root elements
* arbitrary conditional child trees outside `<Show>`
* arbitrary array mapping to JSX children outside `<For>`
* spread attributes
* component composition that requires module graph analysis beyond direct `.wc`
  imports
* imported CSS module object access
* source maps
* production native package publishing

The compiler should fail early on unsupported syntax rather than quietly add a
framework runtime.

## Development

Run the normal checks from the workspace root.

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

Useful package boundaries:

* `crates/lean-wc-core`: Rust compiler analysis and code generation
* `crates/lean-wc-node`: N-API wrapper around the Rust core
* `packages/core-node`: typed Node loader for the native binding
* `packages/lean-wc`: authoring API, JSX types, runtime helper, and Vite plugin
* `examples/counter`: Vite example and browser smoke test

## Roadmap

Near-term work should focus on compiler correctness before broadening the API:

* continue replacing MVP extraction logic with fuller OXC AST-driven analysis
* add source-map generation
* add span-based diagnostics for unsupported syntax
* expand accepted TSX fixtures and rejection fixtures
* decide the CSS strategy for imported styles and Vanilla Extract
* prepare native binary packaging for supported platforms
* document migration and comparison pages once the API stabilizes

## Research Links

Official or primary references used for the comparison snapshot:

* [MDN Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)
* [Lit](https://lit.dev/docs/)
* [Stencil](https://stenciljs.com/docs/introduction)
* [FAST](https://www.fast.design/)
* [Svelte custom elements](https://svelte.dev/docs/svelte/custom-elements)
* [Vue custom elements](https://vuejs.org/guide/extras/web-components)
* [Angular Elements](https://angular.dev/guide/elements)
* [Atomico](https://atomicojs.dev/)
* [Hybrids](https://hybrids.js.org/)
* [Preact custom elements](https://preactjs.com/guide/v10/preact-custom-element/)
* [Solid Element](https://github.com/solidjs/solid/blob/main/packages/solid-element/README.md)
* [Mitosis](https://mitosis.builder.io/docs/overview/)
* [OXC](https://oxc.rs/)
* [SWC](https://swc.rs/)
* [Rolldown](https://rolldown.rs/)
* [esbuild](https://esbuild.github.io/)
