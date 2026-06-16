# lean-wc Authoring Guide

`lean-wc` is a Rust/OXC-powered TSX compiler for native Web Components. The
TypeScript package provides the authoring types, JSX surface, and Vite plugin;
the compiler semantics live in Rust and are exposed to Node through the native
`@lean-wc/core-node` wrapper.

This guide describes the current MVP authoring model. The authoring functions
are compile-time APIs. They throw if a `.wc.tsx` source file is executed without
the compiler transform.

## Project Language

English is the project language. Public APIs, package names, docs, examples,
diagnostics, and generated user-facing messages should be written in English.

## Component Files

Component source files should use the `.wc.tsx` extension so the Vite plugin can
select them with its default include filter.

```tsx
import { event, state, type ComponentOptions } from "lean-wc"

export type CounterProps = {
  label?: string
}

export const options = {
  shadow: true,
} satisfies ComponentOptions

export function Counter({ label = "Count" }: CounterProps = {}) {
  const count = state(0)
  const change = event<number>("change")

  return (
    <button
      part="button"
      data-count={count()}
      onClick={() => {
        count.set(count() + 1)
        change.emit(count())
      }}
    >
      {label}: {count()}
    </button>
  )
}
```

The compiler emits a native `HTMLElement` subclass, registers it with
`customElements.define()` by default, and exports the generated class as the
function component name plus a default export.

## TypeScript Setup

Use the automatic JSX runtime and point `jsxImportSource` at `lean-wc`.

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "lean-wc",
    "types": ["vite/client"]
  }
}
```

The package exposes:

* `lean-wc`: authoring functions and shared runtime helpers.
* `lean-wc/jsx-runtime`: intrinsic JSX element and attribute types.
* `lean-wc/jsx-dev-runtime`: development JSX runtime surface.
* `lean-wc/vite`: Vite transform plugin.

## Vite Setup

Build the local native binding before running Vite in this workspace:

```sh
pnpm -w build:native
```

Add the plugin before normal framework or app plugins.

```ts
import { defineConfig } from "vite"
import leanWebComponents from "lean-wc/vite"

export default defineConfig({
  plugins: [leanWebComponents()],
})
```

The default filter transforms `.wc.tsx` files and excludes `node_modules`.

```ts
leanWebComponents({
  include: /\.wc\.tsx$/,
  exclude: /node_modules/,
})
```

## Function Components

Exported PascalCase functions are the preferred component declaration form. The
function name is the authoring name; the native Custom Element tag is inferred
by the compiler.

* `Counter` becomes `x-counter`.
* `CounterButton` becomes `counter-button`.
* `URLBadge` becomes `url-badge`.

Single-word component names receive the `x-` prefix because native Custom
Element tag names must contain a hyphen.

Function props use normal TypeScript types and destructuring defaults. The
compiler turns those destructured names into observed properties and attributes.

```tsx
export type TextFieldProps = {
  disabled?: boolean
  label?: string
  maxLength?: number
}

export function TextField({
  disabled = false,
  label = "Name",
  maxLength = 80,
}: TextFieldProps = {}) {
  return (
    <label>
      {label}
      <input disabled={disabled} data-max-length={maxLength} />
    </label>
  )
}
```

The generated JavaScript property names stay camelCase. Observed attributes use
kebab-case, so `maxLength` observes `max-length`.

## Component Options

Function components can export an `options` constant. It uses the defaults shown
below.

```ts
export const options = {
  shadow: true,
  define: true,
  styles: [":host { display: block; }"],
} satisfies ComponentOptions
```

* `shadow`: when `true`, the generated element attaches an open shadow root.
  When `false`, it renders into the element itself.
* `define`: when `true`, the generated module registers the element. When
  `false`, the module exports a generated `defineXName()` function instead.
* `styles`: string expressions injected into a generated `<style>` element at
  the start of the shadow root. The MVP supports simple inline expressions.

## Props

Preferred props are declared through the function parameter type and destructured
defaults.

```tsx
export type CounterProps = {
  enabled?: boolean
  label?: string
  step?: number
}

export function Counter({
  enabled = true,
  label = "Count",
  step = 1,
}: CounterProps = {}) {
  return <button disabled={!enabled}>{label}: {step}</button>
}
```

The compiler infers the MVP conversion kind from the default value:

* string literal defaults become string props.
* `true` or `false` defaults become boolean props.
* numeric defaults become number props.
* props without defaults currently fall back to string conversion.

The legacy `component()` API can still declare accessor props inside the
component callback.

```ts
const label = prop.string("label", "Count")
const disabled = prop.boolean("disabled", false)
const value = prop.number("value", 0)
```

Each prop is available as a typed accessor:

```ts
label()
label.set("Next")
label.update((current) => `${current}!`)
```

The compiler generates property getters/setters and observed attribute handling.
String and number props synchronize as string attributes. Boolean props
synchronize through attribute presence.

## State

State is local to the generated element instance.

```ts
const count = state(0)

count()
count.set(count() + 1)
count.update((current) => current + 1)
```

State writes trigger an update pass for generated text and dynamic attributes.

## Events

Events are typed at authoring time.

```ts
const change = event<number>("change")

change.emit(count())
```

The generated emitter dispatches a `CustomEvent` with `bubbles: true`,
`composed: true`, and `cancelable: false` in the current MVP.

## JSX Surface

The MVP supports native element tags, text interpolation, static attributes,
dynamic attributes, event handlers, PascalCase child components, and slots.

```tsx
return (
  <button part="button" disabled={disabled} onClick={() => count.update((n) => n + 1)}>
    <slot name="icon" />
    {label}: {count()}
  </button>
)
```

Supported typed attributes include common DOM attributes, `aria-*`, `data-*`,
`part`, `slot`, `class`, `value`, and common event handlers such as `onClick`,
`onInput`, `onFocus`, and `onBlur`. Additional intrinsic element names are
accepted through the JSX index signature.

PascalCase child components are rewritten to inferred Custom Element tags.
Direct `.wc` imports are preserved as side-effect imports so the generated child
element module still runs.

```tsx
import { Counter } from "./counter.wc.tsx"

export function Dashboard() {
  return <Counter label="Nested" />
}
```

## Legacy Component API

The original `component(tagName, options?, render)` form remains available as a
low-level compatibility path. New component files should prefer exported
PascalCase functions.

## Verification Commands

From the workspace root:

```sh
pnpm install
pnpm build:native
pnpm check-types
pnpm test
pnpm --filter @lean-wc/example-counter type-check
pnpm --filter @lean-wc/example-counter build
pnpm --filter @lean-wc/example-counter test
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --workspace
```
