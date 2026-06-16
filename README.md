# Iktia

Iktia is a TSX compiler for native interface elements.

Write declarative TypeScript and TSX. Iktia compiles that source into
lightweight Web Components for design systems, embedded widgets, CMS pages, and
classic web applications.

No React runtime. No virtual DOM. Just typed components shaped into native
elements.

```tsx
import { computed, event, on, state } from "@iktia/core"

export type CounterProps = {
  label?: string
}

export function Counter({ label = "Count" }: CounterProps = {}) {
  const count = state(0)
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

This repository is a prerelease compiler toolchain, not a production release.
The current implementation proves the vertical slice:

* typed TypeScript authoring API and JSX surface
* PascalCase function component authoring with kebab-case Custom Element output
* `state()`, `computed()`, and `effect()` authoring primitives
* `<Show>` and keyed `.map()` compile-time control flow
* Rust/OXC TSX parse validation and compiler analysis
* native Custom Element code generation
* Declarative Shadow DOM prerender output and hydration for explicit static
  HTML paths
* typed N-API boundary and Node wrapper
* Vite transform plugin
* Ardo-rendered docs plus linked static demos with Playwright browser gates
* Shadow DOM style injection and default/named slots

See [docs/compiler-limitations.md](docs/compiler-limitations.md) for the current
accepted syntax boundary.

## Why This Exists

Web Components are the browser platform's reusable component primitive. The
ecosystem already has mature ways to build them: runtime libraries, framework
adapters, full compilers, and design-system toolkits. Iktia explores a focused
point in that landscape:

* Rust owns compiler semantics.
* TypeScript owns authoring types, package ergonomics, and Vite integration.
* The browser receives native Custom Elements.
* The component model stays deliberately small and statically analyzable.

The bet is that a narrow compiler can give design-system and embedded-widget
teams a useful middle ground: more structure than hand-written Custom Elements,
less runtime surface than framework-backed wrappers.

## Good Fit

Iktia is aimed at:

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

For package consumers, install the public packages:

```sh
pnpm add @iktia/core @iktia/runtime
pnpm add -D @iktia/compiler @iktia/vite @iktia/cli
```

For repository development, install dependencies and build the local native
binding from the workspace root.

```sh
pnpm install
pnpm build:native
```

Configure TypeScript for the automatic JSX runtime.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@iktia/core"
  }
}
```

Add the Vite plugin.

```ts
import { defineConfig } from "vite"
import { iktia } from "@iktia/vite"

export default defineConfig({
  plugins: [iktia()],
})
```

The Vite plugin emits prerender metadata by default for static HTML and DSD
workflows. Use `iktia({ prerender: false })` only for builds that never need
that metadata.

Create a `.wc.tsx` file and import it from your app.

```ts
import "./counter.wc.tsx"
```

Run the example.

```sh
pnpm --filter @iktia/example-counter build
pnpm --filter @iktia/example-counter test
```

The public site is split into Ardo-rendered docs at the root and linked static
Iktia demos under `/demos/`. The demos cover reactive state, events, primitive
parts/slots/state attributes, PascalCase composition, CSS variables, and a
generated Declarative Shadow DOM page with delayed custom-element upgrade. See
[docs/demos.md](docs/demos.md) for the docs/demo matrix, local commands, and
Pages workflow details.

## Authoring Model

Exported PascalCase functions are the preferred component declaration form. The
TypeScript name is the authoring contract; the native Custom Element tag is a
compiler detail. `Counter` compiles to `x-counter`, while multi-word names such
as `CounterButton` compile to `counter-button`.

```tsx
import { Show, computed, event, on, state, type ComponentOptions } from "@iktia/core"
import css from "./button.css?inline"

export type ButtonProps = {
  label?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function Button({ label = "Save" }: ButtonProps = {}) {
  const pressed = state(false)
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
* optional `export const options satisfies ComponentOptions` for CSS styles
* `state(initialValue)` for writable local state
* `computed(() => value)` for read-only derived values
* `effect(() => cleanup?)` for lifecycle side effects
* `event<Detail>(name)`
* `on(name, handler)` for typed DOM event composition
* `host()` for element, root, update, and abort-signal access
* `<Show>` and keyed `.map()` as explicit compile-time control flow
* typed JSX intrinsic elements and common DOM/event attributes

For details, see [docs/authoring.md](docs/authoring.md).

## Packages

```txt
@iktia/core       Authoring API and JSX runtime types
@iktia/runtime    Tiny platform helpers for generated elements
@iktia/compiler   Node wrapper around the Rust compiler
@iktia/compiler-* Platform-specific optional native compiler bindings
@iktia/cli        Minimal compile, prerender, and info commands
@iktia/vite       Vite transform and prerender metadata integration
```

`@iktia/runtime` is intentionally not a component runtime. It may expose small
platform helpers such as event creation, scheduling, or hydration helpers, but
it must not grow into a reconciler, virtual DOM, hook system, or framework
runtime.

## Architecture

```text
.wc.tsx source
  -> Vite plugin filter
  -> @iktia/compiler typed wrapper
  -> optional @iktia/compiler-* native package
  -> iktia-node N-API module
  -> iktia-core Rust compiler
  -> OXC TSX parse validation
  -> component analysis and code generation
  -> native Custom Element JavaScript
```

The TypeScript packages stay thin. They provide types, authoring stubs, runtime
helpers, and bundler integration. The Rust crates own parsing, analysis, and
output decisions.

Component styles use Vite `?inline` CSS text imports:

```tsx
import css from "./button.css?inline"

export const options = {
  styles: [css],
} satisfies ComponentOptions
```

Iktia treats CSS as flat text for v0.1. Vite owns CSS loading; CSS custom
properties are the supported theming boundary.

The normal Vite transform emits imperative Custom Element modules. When a build
uses an explicit prerender entry point, Declarative Shadow DOM is the default
HTML output for Iktia components. The generated client class adopts an existing
declarative shadow root before any `attachShadow()` fallback, binds internal
`data-iktia-*` hydration markers, throws a clear development mismatch
diagnostic, and remounts imperatively in production when a stale prerender
artifact cannot be hydrated.

## Landscape

This section is a product-positioning snapshot from June 2026. It is meant to
explain where Iktia fits, not to rank mature projects against an MVP.

| Tool or category | Authoring model | Runtime or output model | Strong fit | How Iktia differs |
| --- | --- | --- | --- | --- |
| Native Custom Elements | JavaScript classes extending `HTMLElement` | Browser-native Custom Elements | Maximum platform control and minimum dependency surface | Adds typed TSX authoring and compiler-generated boilerplate |
| Lit | `LitElement`, reactive properties, tagged template literals | Lightweight Lit runtime and reactive update cycle | Mature web component libraries with broad docs and ecosystem | Avoids a template/runtime library and compiles a narrow TSX subset to direct DOM code |
| Stencil | TypeScript, JSX, and CSS compiler for Web Components | Compiler-generated Custom Elements | Production component libraries that need a complete Web Component compiler toolchain | Closest category neighbor, but Iktia is Rust/OXC-first and intentionally smaller |
| FAST | Web Component libraries and design-system foundation | FAST element/runtime model and component packages | Design systems aligned with FAST/Fluent patterns | Does not provide a design system or runtime foundation package |
| Svelte custom elements | Svelte components compiled behind a Custom Element wrapper | Svelte component lifecycle wrapped as a custom element | Teams already building in Svelte that need custom-element distribution | The source component is the Custom Element contract itself, not a wrapped framework component |
| Vue custom elements | Vue component APIs through `defineCustomElement()` | Native Custom Element constructor backed by Vue's component model | Vue teams publishing embeddable components | Does not bring Vue's component/runtime model into the element |
| Angular Elements | Angular components packaged as Custom Elements | Angular component model exposed through Custom Elements | Angular organizations integrating with non-Angular hosts | Not an adapter for a full application framework |
| Atomico | Function and hooks style authoring for Web Components | Small library with hooks and virtual DOM concepts | React-like function authoring for Web Components | Keeps the authoring API compile-time only and avoids a client-side virtual DOM |
| Hybrids | Declarative object and functional component model | Framework API over Web Components | Functional/declarative Web Component applications and libraries | Uses Rust compiler analysis instead of a runtime object model |
| Preact custom element wrappers | Preact component registered as a custom element | Preact runtime wrapped behind Custom Elements | Preact teams needing simple Custom Element interop | Does not wrap a Preact component or runtime |
| Solid custom elements | Solid integration for Custom Web Components | Solid primitives exposed through Custom Elements | Solid teams that want custom-element distribution | Solid-inspired ergonomics without depending on Solid runtime semantics |
| Mitosis | JSX source compiled to many frameworks | Framework-specific generated outputs | Design systems that must target React, Vue, Svelte, Angular, Solid, Qwik, and more | Targets one output deliberately: native Custom Elements |

Stencil is the closest established category neighbor because it is also a
complete, established compiler ecosystem. Iktia is a focused experiment in
what a smaller Rust/OXC-first compiler can provide with a deliberately narrow
authoring boundary and no framework runtime goal.

## Development

Build and test from the workspace root.

```sh
pnpm install
pnpm build:native
pnpm build:docs
pnpm check-native-types
pnpm check
pnpm test
pnpm --filter @iktia/example-counter type-check
pnpm --filter @iktia/example-counter build
pnpm --filter @iktia/example-counter test
```

Workspace layout:

* `crates/iktia-core`: Rust compiler analysis and code generation
* `crates/iktia-node`: N-API wrapper around the Rust core
* `packages/compiler`: typed Node loader for optional native bindings
* `packages/compiler-*`: platform-specific native compiler packages
* `packages/cli`: minimal compile, prerender, and info commands
* `packages/core`: authoring API and JSX types
* `packages/runtime`: runtime helper surface
* `packages/vite`: Vite plugin and prerender metadata integration
* `examples/counter`: browser smoke-test example and static DSD output
* `sites/docs`: Ardo documentation site for v0.1 docs and API content

Useful references:

* [Authoring guide](docs/authoring.md)
* [Compiler limitations](docs/compiler-limitations.md)
* [CLI](docs/cli.md)
* [Declarative Shadow DOM plan](docs/declarative-shadow-dom-plan.md)
* [Native distribution](docs/native-distribution.md)
* [Docs and demos](docs/demos.md)
* [MDN Web Components](https://developer.mozilla.org/en-US/docs/Web/API/Web_components)

## License

Apache-2.0
