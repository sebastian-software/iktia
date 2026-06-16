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

The legacy `component(tagName, options?, render)` and `prop.*()` forms are not
part of the v0.1 public authoring API. The compiler should reject them with a
direct diagnostic instead of lowering them.

OXC validates that the module parses as TSX before transform-specific analysis
runs. The primary component analyzer uses OXC AST facts for `.wc` imports,
function component discovery, local `state()`, `computed()`, `effect()`, and
`event()` declarations, host helper usage, removed API detection, and returned
TSX template spans.

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

`styles: [...]` injects string expressions into a generated `<style>` element
when `shadow: true`.

```tsx
export const options = {
  shadow: true,
  styles: [":host { display: inline-block; }", "button { color: red; }"],
} satisfies ComponentOptions

export function Button() {
  return <button><slot /></button>
}
```

The current MVP is designed for inline string expressions. CSS module imports,
Vanilla Extract integration, constructable stylesheets, CSS asset bundling, and
source-map-aware CSS diagnostics are later milestones.

## Declarative Shadow DOM Boundary

Declarative Shadow DOM is generated only through the explicit prerender API.
Normal client builds keep the imperative Custom Element path and do not add a
public `ComponentOptions.dsd` flag.

The DSD serializer supports:

* `shadow: true` components with `shadowrootmode="open"`.
* Static elements, static attributes, text, slots, and inline style strings.
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
* Removed v0.1 APIs: `component()`, `prop.*()`, `prop()`, `signal()`, and
  `useHost()`.
* Callback expression bodies such as `() => <button />`.
* Return values not wrapped in parentheses.
* Event option code generation from `event(name, options)`.
* Source maps.
* `closed` declarative shadow roots and `shadowrootserializable`.
* A core Declarative Shadow DOM polyfill.

## Native Binding Boundary

The Node package is a thin typed adapter around the Rust N-API module. It expects
the native binding to exist at `packages/compiler/native/iktia_node.node` in
local workspace development.

```sh
pnpm -w build:native
```

The package is not yet prepared for published multi-platform native artifacts.
Release packaging, target triples, CI build matrices, and install-time fallback
strategy are release-preparation work.

## Error Model

Current errors are intentionally plain and early:

* TSX parse errors come from OXC.
* Missing or unsupported component shapes return compiler errors.
* Vite wraps transform failures with the source filename.

Future work should add spans, source-map-aware diagnostics, and fixture coverage
for every supported rejection path.
