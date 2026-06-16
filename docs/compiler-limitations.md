# Compiler Limitations

This document records the current MVP boundary. The compiler intentionally
accepts a narrow, statically analyzable subset of TSX so the Rust core can own
semantics without introducing a framework runtime, virtual DOM, or React
compatibility layer.

## Supported Shape

A component module should contain one exported PascalCase function component:

```tsx
export function Counter({ label = "Label" }: CounterProps = {}) {
  const count = signal(0)

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
* `const` declarations for `signal()`, `computed()`, `effect()`, and `event()`.
* A single root TSX element.

The legacy `component(tagName, options?, render)` form is still supported for
compatibility. That path expects a string literal tag name, an arrow function
callback with a block body, and `const` declarations for `prop.*()`, `prop()`,
`state()`, `signal()`, `computed()`, `effect()`, and `event()`.

OXC validates that the module parses as TSX before transform-specific analysis
runs. The primary component analyzer uses OXC AST facts for `.wc` imports,
function component discovery, legacy `component()` call discovery, local
`signal()`, `state()`, `computed()`, `effect()`, and `event()` declarations,
host helper usage, and returned TSX template spans.

Some MVP detail parsers remain intentionally conservative: function prop
destructuring, legacy `prop.*()` declarations, component options, inline style
arrays, and generated-template parsing still use narrow source-slice analysis
fed by AST-selected regions.

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
* Explicit `<For each={...}>{(item, index) => <span />}</For>` control flow.
* PascalCase child components imported from direct `.wc` modules.
* Default and named slots.
* `part`, `class`, `data-*`, `aria-*`, and common DOM attributes.

Generated updates currently cover dynamic attributes, text bindings, effects,
`<Show>` containers, and `<For>` containers. `<For>` re-renders its container on
update; keyed list diffing is not part of the current MVP.

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

## Unsupported Patterns

The compiler should reject or fail fast on patterns outside the MVP instead of
silently producing framework-like runtime behavior.

Currently unsupported:

* Multiple root JSX elements or fragments.
* Conditional JSX branches outside `<Show>`.
* Array mapping to JSX children outside `<For>`.
* Spread attributes.
* Component composition that requires module graph analysis beyond direct `.wc`
  imports.
* React hooks, Solid runtime signals, or framework lifecycle compatibility.
* Runtime virtual DOM reconciliation.
* Imported CSS object access such as `styles.button`.
* Rest props in function component parameter destructuring.
* Non-`const` authoring declarations.
* Dynamic `component()` tag names.
* Callback expression bodies such as `() => <button />`.
* Return values not wrapped in parentheses.
* Event option code generation from `event(name, options)`.
* Source maps.

## Native Binding Boundary

The Node package is a thin typed adapter around the Rust N-API module. It expects
the native binding to exist at `packages/core-node/native/lean_wc_node.node` in
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
