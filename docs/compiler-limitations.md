# Compiler Limitations

This document records the current MVP boundary. The compiler intentionally
accepts a narrow, statically analyzable subset of TSX so the Rust core can own
semantics without introducing a framework runtime, virtual DOM, or React
compatibility layer.

## Supported Shape

A component module should contain one exported PascalCase function component:

```tsx
export function Counter({ label = "Label" }: CounterProps = {}) {
  const count = state(0)

  return (
    <button onClick={on("click", () => count.update((value) => value + 1))}>
      {label}: {count()}
    </button>
  )
}
```

Current analysis expects:

* One exported PascalCase function declaration.
* A deterministic inferred Custom Element tag name.
* Destructured function props when props are needed.
* A `return (...)` TSX template.
* `const` declarations for `state()`, `computed()`, `effect()`, and `event()`.
* A single root TSX element.

OXC validates that the module parses as TSX before transform-specific analysis
runs. The primary component analyzer uses OXC AST facts for `.wc` imports,
function component discovery, local `state()`, `computed()`, `effect()`, and
`event()` declarations, host helper usage, unsupported syntax detection, and
returned TSX template spans.

Some MVP detail parsers remain intentionally conservative: function prop
destructuring, component options, inline style arrays, and generated-template
parsing still use narrow source-slice analysis fed by AST-selected regions.

## Template Support

The MVP template parser supports:

* Native element tags, including custom element names.
* Self-closing elements.
* Nested elements.
* Static quoted attributes.
* Boolean attributes.
* Braced attribute expressions.
* Event attributes such as `onClick`.
* Text interpolation with `{expression}` chunks.
* Explicit `<Show when={...} fallback={...}>...</Show>` control flow.
* Keyed `.map()` list control flow, for example
  `{items().map((item, index) => <span key={item.id} />)}`.
* PascalCase child components imported from direct `.wc` modules.
* Default and named slots.
* `part`, `class`, `data-*`, `aria-*`, and common DOM attributes.

Generated updates currently cover dynamic attributes, text bindings, effects,
`<Show>` containers, and keyed `.map()` list containers. Lists re-render their
container on update; keyed diffing is not part of the current MVP.

## Styling Boundary

`styles: [...]` injects string expressions into a generated `<style>` element.
Public v0.1 component CSS uses Vite `?inline` imports.

```tsx
import css from "./button.css?inline"

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function Button() {
  return <button><slot /></button>
}
```

The current MVP is designed for flat CSS text. Vite owns the import, asset, and
invalidation behavior; Iktia does not implement a CSS graph. CSS module
contracts, Sass, recursive CSS imports, constructable stylesheets, CSS asset
bundling, and source-map-aware CSS diagnostics are later milestones. CSS custom
properties are the v0.1 theming mechanism.

## Declarative Shadow DOM Boundary

Declarative Shadow DOM is generated through the explicit prerender API. Normal
client builds keep the imperative Custom Element path. Once a component enters
the prerender path, Iktia emits DSD host HTML by default.

The DSD serializer supports:

* `shadowrootmode="open"` host HTML.
* Static elements, static attributes, text, slots, and resolved `?inline` CSS
  text.
* Prop defaults and JSON-provided prerender props.
* `state()` initializers when they are supported literals.
* Literal arrays and objects for initial values.
* Simple template strings, identifier reads, accessor reads, boolean negation,
  and simple boolean conditionals over supported values.
* Visible `data-iktia-*` markers in DSD HTML only.

The DSD serializer does not execute arbitrary JavaScript or TypeScript. Computed
callbacks, effects, event handlers, imports, browser APIs, and unsupported
dynamic expressions are left for client hydration. Development hydration
mismatches throw a `Iktia hydration mismatch` diagnostic. Production builds
fall back to an imperative remount.

## Unsupported Patterns

The compiler should reject or fail fast on patterns outside the MVP instead of
silently producing framework-like runtime behavior.

Currently unsupported:

* Multiple root JSX elements or fragments.
* Conditional JSX branches outside `<Show>`.
* Unkeyed `.map()` JSX list children.
* `.map()` list callbacks with block bodies or non-JSX return values.
* Arbitrary array mapping or list expressions outside the accepted keyed
  `.map()` form.
* Spread attributes.
* Component composition that requires module graph analysis beyond direct `.wc`
  imports.
* React hooks, Solid runtime signals, or framework lifecycle compatibility.
* Runtime virtual DOM reconciliation.
* Imported CSS object access such as `styles.button`.
* Rest props in function component parameter destructuring.
* Non-`const` authoring declarations.
* Callback expression bodies such as `() => <button />`.
* Return values not wrapped in parentheses.
* Event option code generation from `event(name, options)`.
* `closed` declarative shadow roots and `shadowrootserializable`.
* A core Declarative Shadow DOM polyfill.

## Native Binding Boundary

The Node package is a thin typed adapter around the Rust N-API module. Published
installs resolve platform-specific optional native packages. Local workspace
development falls back to `packages/compiler/native/iktia-node.node`.

```sh
pnpm -w build:native
pnpm check-native-types
```

See [Native distribution](native-distribution.md) for the package matrix,
loader order, source-build guidance, and generated N-API boundary types.

## Error Model

Compiler API failures throw `IktiaCompilerError` with `diagnostics[]`.
Diagnostics include a code, severity, message, filename, optional UTF-8 span,
and optional hint. Vite and the CLI render that shared structure.

Transforms return a native source-map object from Rust as `map?`. The current
map is emitted by the native transform workflow; broader span coverage for
every rejection path remains future hardening work.

Future work should add span-rich diagnostics and fixture coverage for every
supported rejection path.
