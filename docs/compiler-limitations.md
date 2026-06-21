# Compiler Limitations

This document records the current MVP boundary. The compiler intentionally
accepts a narrow, statically analyzable subset of TSX so the Rust core can own
semantics without introducing a framework runtime, virtual DOM, or React
compatibility layer.

## Supported Shape

A component module should contain one exported PascalCase instance setup
function. The function body declares per-instance props, state, computed values,
effects, events, host access, and a single JSX view for the generated Custom
Element instance:

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
* A single JSX return that declares the component view.
* `const` declarations for `state()`, `computed()`, `effect()`, `event()`, and
  experimental `formControl()`.
* A single root TSX element.

OXC validates that the module parses as TSX before transform-specific analysis
runs. The primary component analyzer uses OXC AST facts for `.wc` imports,
function component discovery, local `state()`, `computed()`, `effect()`, and
`event()` declarations, host helper usage, unsupported syntax detection, and
returned JSX template spans.

The exported component function is not a React-style render function and is not
called again during updates. The closest comparison points are setup-once and
compiler-oriented systems such as Solid and Svelte, not runtime rerendering.
Factory render callbacks such as `return () => <JSX>` are not part of Iktia's
v0.1 component shape. Generated state writes, prop changes, effects, and host
updates drive the DOM patch code instead.

The single JSX return can still describe multiple visual states. Loading,
error, empty, and ready views should be modeled as state or derived values and
explicit control-flow subtrees inside the returned template. Use `<Show>` for
binary conditionals and `<Switch>/<Match>` when exactly one state view should
win. The compiler boundary rejects arbitrary returned render functions, not
conditional UI.

Some MVP detail parsers remain intentionally conservative: function prop
destructuring, component options, inline style arrays, and generated-template
parsing still use narrow source-slice analysis fed by AST-selected regions.

`state(propName)` is supported for string, number, and boolean props. The
compiler initializes that state once from current props after initial attributes
are processed and before mount or hydration. This is an initial uncontrolled
value, not a controlled binding.

`formControl({ value, reset, disabled })` is supported as an experimental body
helper when the options object is statically analyzable. `value` must be an
arrow function expression. `reset` can be an arrow function body. `disabled`
currently maps to a boolean prop identifier so generated
`formDisabledCallback()` can synchronize fieldset disabled state.

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
* Explicit `<Switch>` / `<Match when={...}>` multi-way control flow with one
  optional trailing default `<Match>`.
* Item-keyed `<For each={...}>...</For>` list control flow.
* Position-keyed `<Index each={...}>...</Index>` list control flow.
* Keyed `.map()` list control flow shorthand, for example
  `{items().map((item, index) => <span key={item.id} />)}`.
* PascalCase child components imported from direct `.wc` modules.
* Default and named slots.
* `part`, `class`, `data-*`, `aria-*`, and common DOM attributes.
* `ref` on static native elements. Identifier refs receive the generated element
  once at mount or hydration time. Callback refs are currently supported only as
  inline arrow expressions, for example `ref={(element) => useElement(element)}`.

Generated updates currently cover dynamic attributes, text bindings, effects,
`<Show>` containers, `<Switch>` containers, `<For>` containers, `<Index>`
containers, and keyed `.map()` list containers. Item-keyed lists reuse row
nodes by key; index-keyed lists reuse row nodes by position and rebind item
accessors on update.

Item-keyed list row bindings can use a local keyed selector helper when the
helper is a one-argument arrow function that directly compares a state accessor
to the argument:

```ts
const selected = state("a")
const isSelected = (id: string) => selected() === id
```

Bindings such as `aria-selected={isSelected(row.id)}` and
`data-state={isSelected(row.id) ? "selected" : "idle"}` are lowered to keyed
dirty bindings. Updating `selected` reruns row bindings registered for only the
previous and next keys, without rerunning the full keyed list reconciliation.

## Dependency Detection Boundary

Reactive update dependencies are detected from AST-selected source slices with
a narrow lexical scan, not a full expression AST walk. The scan skips comments
and string literals and reads template-literal interpolation, but complex
JavaScript syntax such as regex literals, dynamic helper indirection, and
dependencies hidden inside arbitrary callbacks may still fall back to broad
reruns. That fallback is conservative: it may update more DOM or rerun an
effect, but it should not skip a known state, prop, or computed dependency.

Keyed selector lowering stays inside that static boundary. The compiler
recognizes direct local one-parameter arrow helpers in either comparison order,
for example `selected() === id` or `id === selected()`. A row binding is keyed
only when the binding expression contains exactly one recognized selector call.
Arbitrary selector bodies, imported helpers, multiple selector calls in one
binding, non-state comparisons, and helper indirection fall back to normal
dependency detection.

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
* `state()` initializers when they are supported literals or supported
  prop-derived values.
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
* Conditional JSX branches outside `<Show>` or `<Switch>/<Match>`.
* Dynamic `<Switch>` children, multiple default `<Match>` arms, or `<Match>`
  outside a direct `<Switch>` child position.
* Unkeyed `.map()` JSX list children.
* `<For>` children without a key on the returned root element.
* `.map()` list callbacks with block bodies or non-JSX return values.
* Arbitrary array mapping or list expressions outside the accepted `<For>`,
  `<Index>`, or keyed `.map()` forms.
* `ref` inside dynamic `<For>`, `<Index>`, or keyed `.map()` row templates.
* Ref callback variables such as `ref={callbackRef}`; use an inline arrow
  callback or an identifier value ref instead.
* Cleanup functions returned from ref callbacks.
* Spread attributes.
* Component composition that requires module graph analysis beyond direct `.wc`
  imports.
* React hooks, Solid runtime signals, or framework lifecycle compatibility.
* Runtime virtual DOM reconciliation.
* Imported CSS object access such as `styles.button`.
* Rest props in function component parameter destructuring.
* Non-`const` authoring declarations.
* Factory render functions such as `return () => <button />`.
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
See [Compiler diagnostics](compiler-diagnostics.md) for the current code
catalog.

The first span-rich diagnostic batch covers AST-owned authoring failures such
as removed API calls and invalid `computed()` or `effect()` callbacks. Some
string-parsed and generated-template failures still report module-level
diagnostics until those paths move onto span-aware analysis.

Transforms return a native source-map object from Rust as `map?`. The current
map is emitted by the native transform workflow and includes the original source
content. Its mappings are intentionally coarse line mappings today; node-level
source-map segments remain future hardening work.

Future work should add span-rich diagnostics and fixture coverage for every
supported rejection path, then replace coarse generated-line mappings with
node-level source-map segments.

## Conformance Fixtures

The local conformance suite in
`crates/iktia-core/tests/fixtures/conformance` defines the durable compiler
boundary for accepted, rejected, and Declarative Shadow DOM authoring patterns.
See [Compiler conformance fixtures](conformance-fixtures.md) for the fixture
layout and rules for adding coverage when compiler syntax changes.
