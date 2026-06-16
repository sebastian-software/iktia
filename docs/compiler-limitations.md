# Compiler Limitations

This document records the current MVP boundary. The compiler intentionally
accepts a narrow, statically analyzable subset of TSX so the Rust core can own
semantics without introducing a framework runtime, virtual DOM, or React
compatibility layer.

## Supported Shape

A component module must contain a supported `component()` call:

```tsx
export default component("x-name", { shadow: true }, () => {
  const label = prop.string("label", "Label")
  const count = state(0)

  return (
    <button onClick={() => count.update((value) => value + 1)}>
      {label()}: {count()}
    </button>
  )
})
```

Current analysis expects:

* A string literal tag name.
* An arrow function component callback.
* A block body callback.
* A `return (...)` TSX template.
* `const` declarations for `prop.*()`, `prop()`, `state()`, and `event()`.
* A single root TSX element.

OXC validates that the module parses as TSX before the MVP extraction logic
runs. The current extraction layer is intentionally conservative and does not
yet use the full OXC AST for every semantic read.

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
* Default and named slots.
* `part`, `class`, `data-*`, `aria-*`, and common DOM attributes.

Generated updates currently cover dynamic attributes and text bindings. The
compiler does not diff child lists or re-run JSX construction.

## Styling Boundary

`styles: [...]` injects string expressions into a generated `<style>` element
when `shadow: true`.

```tsx
component("x-button", {
  shadow: true,
  styles: [":host { display: inline-block; }", "button { color: red; }"],
}, () => {
  return <button><slot /></button>
})
```

The current MVP is designed for inline string expressions. CSS module imports,
Vanilla Extract integration, constructable stylesheets, CSS asset bundling, and
source-map-aware CSS diagnostics are later milestones.

## Unsupported Patterns

The compiler should reject or fail fast on patterns outside the MVP instead of
silently producing framework-like runtime behavior.

Currently unsupported:

* Multiple root JSX elements or fragments.
* Conditional JSX branches.
* Array mapping to JSX children.
* Spread attributes.
* Component composition through capitalized TSX tags.
* React hooks, Solid signals, or framework lifecycle compatibility.
* Runtime virtual DOM reconciliation.
* Imported CSS object access such as `styles.button`.
* Destructured authoring declarations.
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

