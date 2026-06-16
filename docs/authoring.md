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

Declarative Shadow DOM is an explicit prerender/static-HTML path, not a new
component authoring option. Enable the optional Vite manifest only when a build
step needs DSD metadata.

```ts
leanWebComponents({
  prerender: {
    include: /\.wc\.tsx$/,
    exclude: /node_modules/,
    manifestFile: "lean-wc-manifest.json",
  },
})
```

For direct prerendering, call the Node wrapper with source text and optional
initial props. The Rust core serializes `shadow: true` components as host HTML
with `<template shadowrootmode="open">`.

```ts
import { renderDeclarativeShadowDom } from "@lean-wc/core-node"

const rendered = renderDeclarativeShadowDom({
  filename: "counter.wc.tsx",
  props: { label: "Count" },
  source,
})

console.log(rendered.html)
```

The generated client module reuses an existing declarative shadow root before
falling back to `attachShadow()`. Hydration markers are emitted only in DSD
HTML. Development builds throw clear mismatch diagnostics; production builds
remount imperatively if the prerendered structure is stale.

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
  DSD prerender serializes supported style strings into the declarative shadow
  template.

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

## Signals

Signals are local to the generated element instance. `signal()` is the preferred
v2 API. `state()` remains available as a legacy alias for older examples and the
low-level `component()` path.

```ts
const count = signal(0)

count()
count.set(count() + 1)
count.update((current) => current + 1)
```

Signal writes trigger an update pass for generated text, dynamic attributes,
control-flow containers, and effects.

## Computed Values

Computed values are read-only derived accessors.

```ts
const count = signal(0)
const doubled = computed(() => count() * 2)

doubled()
```

The current compiler milestone supports pure expression-body callbacks. Computed
values can be used in text bindings, dynamic attributes, `<Show when={...}>`,
`<For each={...}>`, events, and effects.

## Effects And Host Lifecycle

Effects run after the element mounts and run again after generated update
passes. Cleanup functions run before the next effect pass and on disconnect.

```ts
effect(() => {
  const { element, signal } = host()
  element.dataset.ready = "true"

  signal.addEventListener("abort", () => {
    element.dataset.aborted = "true"
  })

  return () => {
    delete element.dataset.ready
  }
})
```

`host()` and `useHost()` return a typed lifecycle handle:

* `element`: the generated custom element instance.
* `root`: the render root, either the shadow root or the host element.
* `signal`: an `AbortSignal` aborted during `disconnectedCallback()`.
* `update()`: an explicit request to run the generated update pass.

## Events

Events are typed at authoring time.

```ts
const change = event<number>("change")

change.emit(count())
```

The generated emitter dispatches a `CustomEvent` with `bubbles: true`,
`composed: true`, and `cancelable: false` in the current MVP.

Use `on(name, handler)` when you want DOM event typing at the callsite while
keeping the generated output as a plain `addEventListener()` callback.

```tsx
<button
  onClick={on("click", (event) => {
    event.preventDefault()
    count.update((value) => value + 1)
  })}
>
  {count()}
</button>
```

## JSX Surface

The MVP supports native element tags, text interpolation, static attributes,
dynamic attributes, event handlers, PascalCase child components, explicit
control-flow primitives, and slots.

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

`<Show>` and `<For>` are compiler primitives, not runtime components.

```tsx
<Show when={count() > 0} fallback={<span>Empty</span>}>
  <span>{count()}</span>
</Show>

<For each={items()}>
  {(item, index) => (
    <span part="indicator" data-index={index}>
      {item}
    </span>
  )}
</For>
```

`<For>` intentionally supports an explicit arrow-function child instead of
arbitrary `items.map()` JSX. The generated MVP output re-renders the list
container on update; keyed diffing is a later compiler decision.

## Primitive Contracts

Primitive Web Component fixtures should use platform-readable contracts rather
than framework-specific class conventions:

* `part="root|label|control|indicator"` for styling from outside Shadow DOM.
* `slot` for caller-provided content.
* `data-state` for state such as `on`, `off`, `open`, or `closed`.
* `data-disabled` when disabled state needs styling hooks.
* `data-orientation` for horizontal or vertical primitives.
* `aria-*` for accessibility state. Dynamic `aria-*` values preserve `false`
  as the string `"false"` instead of removing the attribute.

```tsx
<button
  part="root control"
  data-state={pressed() ? "on" : "off"}
  data-disabled={disabled || undefined}
  aria-pressed={pressed()}
  disabled={disabled}
>
  <span part="label">{label}</span>
  <slot />
</button>
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
