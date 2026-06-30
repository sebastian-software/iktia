# Declarative Shadow DOM Plan

Status: 2026-06-16

This document evaluates Declarative Shadow DOM as a first-class output target
for Naos. The goal is to make generated Web Components useful to the browser
as early as possible: parsed markup, scoped styles, slots, and static structure
should be available before the custom element JavaScript has downloaded,
executed, and upgraded the element.

Implementation status: the first DSD vertical slice is implemented for explicit
prerender/static-HTML output. The normal client transform remains imperative.
The implemented slice covers declarative root adoption, Rust serialization,
DSD-only hydration markers, typed Node/Vite access, Counter/Toggle demos, and
browser tests for delayed upgrade and development mismatch diagnostics.

## Executive Recommendation

Declarative Shadow DOM should become a core direction for Naos, but it
should be implemented in layers:

1. Make generated custom elements safely adopt an existing declarative shadow
   root instead of always calling `attachShadow()`.
2. Add a Rust-owned static serializer that can emit
   `<template shadowrootmode="open">` for the supported template subset.
3. Add a narrow initial-value evaluator for prop defaults, signal/state
   initializers, literal arrays/objects, and simple template strings over those
   values.
4. Add deterministic DSD-only hydration markers so generated JavaScript can
   bind to pre-parsed nodes instead of recreating them.
5. Add Vite/build integration for prerendering demo and documentation pages.
6. Expand toward richer static evaluation only after the hydration contract is
   proven.

Declarative Shadow DOM should not become a separate authoring model. The
preferred authoring surface should remain typed `.wc.tsx`; DSD is an additional
HTML output mode for Naos components in the explicit prerender path.
Normal client builds keep the imperative Custom Element path.

## Locked Decisions

These decisions are fixed for the first DSD implementation pass:

* DSD is generated only by the explicit prerender/static-HTML path.
* In that prerender path, DSD is enabled by default for Naos components.
* DSD is not a new authoring API. Do not add `ComponentOptions.dsd` or a
  general render-mode flag for v1.
* Prerender include/exclude filters are the v1 opt-out mechanism.
* Hydration mismatches throw clear diagnostics in development builds.
* Hydration mismatches fall back to imperative remounting in production builds.
* v1 static evaluation includes prop defaults, signal/state initializers,
  literal arrays/objects, and simple template strings over those values.
* v1 does not execute arbitrary JavaScript or TypeScript.
* Visible `data-naos-*` hydration markers are emitted only in DSD HTML.
* v1 emits only `shadowrootmode="open"`.
* `closed` roots, `shadowrootserializable`, and DSD polyfills are deferred.
* Unsupported browsers use the existing imperative JavaScript fallback.
* Form-heavy primitives should slot native light-DOM controls until
  form-associated Custom Elements are implemented.
* The first DSD demo set should cover both Counter and Toggle.

## Platform Snapshot

Declarative Shadow DOM is now viable for modern-browser output:

* The standardized syntax is `<template shadowrootmode="open">` or
  `<template shadowrootmode="closed">`.
* The HTML parser creates the shadow root while parsing the host element and
  removes the `<template>` from the light DOM.
* Browser support is available in Chromium 111+, Edge 111+, Safari 16.4+, iOS
  Safari 16.4+, and Firefox 123+.
* Can I Use reports 93.17% global support using May 2026 usage data.
* The Web Platform DX feature index marks it Baseline Newly Available since
  2024-02-20 and expects Baseline Widely Available on 2026-08-20.

This is good enough to plan against for modern demos, documentation sites,
embedded widgets, and future production output. It is not old-browser
universal, so the generated client code must still work when no declarative
shadow root exists.

## Relevant Platform Semantics

The implementation has to account for several non-obvious browser rules:

* `shadowrootmode` is parser behavior. Setting the attribute later on a
  `<template>` does not create a shadow root.
* Ordinary `innerHTML` and `DOMParser` paths do not apply Declarative Shadow
  DOM by default. Initial HTML parsing, `setHTMLUnsafe()`, and
  `Document.parseHTMLUnsafe()` are the relevant parser paths.
* Only the first valid declarative shadow template under a host is converted
  into a `ShadowRoot`; later templates remain normal `HTMLTemplateElement`
  nodes.
* The older non-standard `shadowroot` attribute from Chrome 90-110 should not
  be emitted.
* A custom element upgraded from DSD HTML already has a shadow root before its
  constructor runs.
* Calling `attachShadow({ mode: "open" })` on a host with a matching
  declarative root returns the existing root but clears its children. Naos
  must avoid doing this during hydration.
* `ElementInternals.shadowRoot` can expose the declarative root to the custom
  element, including closed roots.
* Inline `<style>` and external `<link rel="stylesheet">` work inside DSD.
* Constructable stylesheets are not serializable into DSD.
* `shadowrootclonable`, `shadowrootserializable`,
  `shadowrootdelegatesfocus`, `shadowrootreferencetarget`, and
  `shadowrootslotassignment` exist as advanced knobs, but should not be part of
  the first Naos milestone unless the implementation needs them.

## Why This Fits Naos

Naos already has the right strategic shape:

* The output is native Custom Elements.
* The compiler owns the template semantics.
* The accepted TSX subset is intentionally narrow and analyzable.
* Styles are currently inline strings, which can be serialized into a DSD
  `<style>` element.
* Slots and primitive contracts already matter to the roadmap.
* Vite can provide both client transforms and build-time static output.

The main change is not the authoring API. It is adding a second generated
artifact: a declarative HTML representation that the browser can parse before
the runtime hydrates.

## Desired Output Shape

For a component like:

```tsx
import css from "./counter.wc.css?inline"

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function Counter({ label = "Count" }: CounterProps = {}) {
  const count = state(0)
  const text = computed(() => `${label}: ${count()}`)

  return (
    <button part="button" data-count={count()}>
      {text()}
    </button>
  )
}
```

A prerendered host could eventually look like:

```html
<x-counter label="Count">
  <template shadowrootmode="open">
    <style>:host { display: inline-block; }</style>
    <button part="button" data-count="0" data-naos-node="0">
      <span data-naos-text="0">Count: 0</span>
    </button>
  </template>
</x-counter>
```

After upgrade, the generated class should:

* adopt the existing shadow root;
* bind `#root` to that root;
* find dynamic nodes by deterministic markers;
* install event listeners;
* run effects after connection;
* flush signal/computed bindings;
* avoid rebuilding the whole tree when the pre-rendered tree matches the
  expected structure;
* fall back to imperative mount when no declarative root exists.

## Current Codegen Gap

The current Rust code generator emits a constructor equivalent to:

```js
constructor() {
  super()
  this.#root = this.attachShadow({ mode: "open" })
}
```

That is correct for imperative Shadow DOM, but unsafe for DSD hydration. If the
HTML parser already attached a declarative root, calling `attachShadow()` with
the same mode would clear the pre-rendered DOM. That would erase the very work
we want the browser to do early.

The first implementation step must therefore centralize root initialization:

```js
constructor() {
  super()
  this.#internals = this.attachInternals?.()
  this.#root =
    this.#internals?.shadowRoot ??
    this.shadowRoot ??
    this.attachShadow({ mode: "open" })
}
```

The exact emitted code should be decided during implementation, especially
because `attachInternals()` will also matter for form-associated custom
elements. The architectural rule is firm: generated code must never call
`attachShadow()` before checking for an existing declarative root.

## Compiler Architecture

Declarative Shadow DOM needs a new output path beside the current JavaScript
module generation.

Recommended Rust-core additions:

* `analyze_component_module(source, filename)` remains the semantic entry.
* The parsed `TemplateElement` tree becomes reusable by both JS codegen and
  HTML serialization.
* Add `serialize_declarative_shadow_dom(module, options)` returning an HTML
  fragment or a structured render result.
* Add deterministic hydration IDs for dynamic attributes, text nodes, event
  targets, `<Show>` anchors, and keyed `.map()` containers.
* Generate hydration lookup code in the JS module when DSD hydration is
  enabled.
* Keep unsupported expressions explicit. The serializer should omit or mark
  dynamic values it cannot safely evaluate rather than running arbitrary user
  JavaScript in Rust.

The Rust core should not evaluate arbitrary TypeScript expressions. Initial DSD
support should serialize the static DOM shell plus supported initial values and
then let client hydration reconcile unsupported dynamic expressions.

## Static Evaluation Boundary

Full server rendering of the current authoring model is not free. The compiler
sees expressions such as:

```ts
computed(() => `${label}: ${count()}`)
```

Rust can parse and serialize that expression, but it cannot safely execute it
without either embedding a JavaScript evaluator or changing the authoring
contract.

Recommended boundary:

* Serialize static elements, static attributes, text, slots, and styles first.
* Evaluate prop defaults and `state()` initializers when they are primitive
  literals, literal arrays, literal objects, or simple template strings over
  other supported initial values.
* Do not evaluate function calls, arbitrary identifiers, computed callbacks,
  effects, event handlers, control-flow callbacks, imports, or browser APIs.
* Mark dynamic text and dynamic attributes with hydration IDs.
* Let the client hydrator run the existing binding logic immediately after
  upgrade.
* Treat richer static evaluation as a later compiler milestone.

This gives us early DOM structure and scoped styles without pretending that DSD
solves arbitrary JavaScript rendering.

## Hydration Contract

Hydration should be structural and deterministic, not virtual-DOM based.

The compiler can assign stable internal markers during code generation:

* `data-naos-node="0"` for dynamic element nodes that need event listeners or
  dynamic attributes.
* `data-naos-text="0"` for dynamic text placeholders.
* comment or element markers for `<Show>` and keyed `.map()` containers.
* optional `data-naos-root` on the first generated child for diagnostic checks.

The generated class can then use the existing shadow root:

```js
this.#button0 = this.#root.querySelector("[data-naos-node='0']")
this.#text0 = this.#root.querySelector("[data-naos-text='0']")
```

If required markers are missing, the component should throw a development
diagnostic. In production it should fall back to imperative remounting so
published pages do not fail hard because of a stale prerender artifact.

Markers are part of DSD HTML only. Normal imperative client rendering should
not add `data-naos-*` attributes merely for debugging symmetry.

## Vite And Build Integration

The Vite plugin currently transforms `.wc.tsx` into client JavaScript. DSD
needs build-time HTML generation too.

Possible integration layers:

1. A low-level Node API in `@naos-ui/compiler`:

   ```ts
   transformComponent(source, filename)
   renderDeclarativeShadowDom(source, filename, props?)
   ```

2. A Vite plugin manifest that records every compiled component's tag name,
   import path, supported SSR capability, and required client module.
3. Prerender include/exclude filters for component-level opt-out without
   changing `ComponentOptions`.
4. An example prerender command that emits HTML for known demo components.
5. Later integration with static site generators or server frameworks through
   the low-level Node API rather than framework-specific adapters.

The first public DSD demo should cover both Counter and Toggle. Counter proves
initial-value serialization, dynamic text/attribute hydration, and click
listeners. Toggle proves primitive contracts, slots, styles, and control-flow
containers.

## Fallback Strategy

Modern browsers with DSD:

* parse the template into a shadow root;
* apply scoped styles immediately;
* display slotted/static content before JS;
* upgrade the custom element later;
* hydrate event listeners and dynamic bindings.

Browsers without DSD:

* keep `<template shadowrootmode="open">` as an inert template in light DOM;
* do not create a shadow root during parsing;
* rely on generated JavaScript to attach and mount the imperative shadow tree.

Recommended fallback:

* Keep the imperative mount path.
* Add a small optional FOUC rule for static demo pages:

  ```css
  x-counter:not(:defined) > template[shadowrootmode] ~ * {
    display: none;
  }
  ```

* Do not ship a DSD polyfill in the core runtime by default.
* Document that old-browser support means JS-required rendering.

## Forms And Accessibility Interactions

Declarative Shadow DOM strengthens early rendering, but it does not remove
Shadow DOM's form and accessibility boundaries.

Important constraints:

* Native form controls inside a shadow root are not automatically visible to an
  ancestor light-DOM form.
* Labels and ARIA references can be difficult across a shadow boundary.
* Form-associated Custom Elements and `ElementInternals` are still needed for
  custom controls that participate in form submission and validation.
* Slotted light-DOM controls remain a strong option for form-heavy components.

This means the React-inspired form plan and the DSD plan should meet at
`ElementInternals`, but neither replaces the other. DSD is about early DOM and
style availability. Form-associated custom elements are about form
participation.

## Proposed Milestones

### D0: Planning And Decision Record

Purpose: document the DSD strategy before implementation.

Planned commits:

* `docs: add declarative shadow dom plan`
* `docs: add declarative shadow dom adr`

Acceptance criteria:

* The platform support and constraints are documented.
* The plan explains why `attachShadow()` must be changed before DSD output.
* The roadmap links DSD ahead of broader form work.
* The locked DSD decisions are captured in a weighted P1 ADR.

### D1: Declarative Root Adoption

Purpose: make generated custom elements safe to upgrade from DSD HTML.

Planned commits:

* `feat: reuse declarative shadow roots`
* `test: add declarative shadow root adoption fixture`

Acceptance criteria:

* Generated classes check for an existing declarative root before calling
  `attachShadow()`.
* Existing imperative rendering still works when no declarative root exists.
* A browser test proves pre-existing DSD content is not cleared during upgrade.

### D2: Static DSD Serializer

Purpose: emit a static declarative shadow template from the Rust template IR.

Planned commits:

* `feat: serialize declarative shadow dom templates`
* `test: add declarative shadow dom snapshot fixtures`

Acceptance criteria:

* Static elements, attributes, text, slots, and inline styles serialize to
  `<template shadowrootmode="open">`.
* Prop defaults and signal/state initializers serialize when they match the v1
  initial-value evaluator.
* Unsupported dynamic expressions are marked for hydration rather than executed
  during prerender.
* Unsupported dynamic structures that cannot be hydrated fail with clear
  diagnostics.
* Component-level render-mode flags are not part of the public DSD contract.

### D3: Hydration Markers And Binding

Purpose: let generated JS bind to pre-rendered nodes.

Planned commits:

* `feat: add hydration markers for generated templates`
* `feat: hydrate declarative shadow dom bindings`
* `test: add hydrated counter browser fixture`

Acceptance criteria:

* Dynamic text and attributes update after upgrade.
* Event listeners attach to pre-rendered nodes.
* Missing markers produce deterministic diagnostics in development builds.
* Missing markers trigger production remount fallback.
* The fallback imperative mount path remains covered.

### D4: Vite Prerender Integration

Purpose: expose DSD output through the TypeScript/Vite toolchain.

Planned commits:

* `feat: expose declarative shadow dom render api`
* `feat: add vite declarative shadow dom manifest`
* `test: add prerendered demo build fixture`

Acceptance criteria:

* A Node wrapper can request DSD HTML for a compiled component.
* The Vite plugin can emit or expose component render metadata.
* Prerender include/exclude filters can opt components out of DSD output.
* The demo app can build a static HTML page containing DSD.

### D5: Demo And Documentation

Purpose: prove the user-facing value.

Planned commits:

* `test: add declarative shadow dom demo`
* `docs: document declarative shadow dom output`
* `docs: document hydration limitations`

Acceptance criteria:

* Counter renders useful styled component DOM before custom element upgrade.
* Toggle renders useful styled component DOM before custom element upgrade.
* Playwright verifies DSD roots exist before upgrade or with delayed JS.
* Documentation explains browser support, fallback behavior, and limitations.

## Deferred Decisions

These decisions are intentionally deferred beyond DSD v1:

* Supporting `shadowrootmode="closed"`.
* Emitting `shadowrootserializable`.
* Shipping or recommending a core DSD polyfill.
* Adding a public component-level DSD option.
* Expanding the evaluator beyond supported initial values.
* Moving form-heavy primitives from slotted native controls to
  form-associated Custom Elements.

## Risks

* Naive `attachShadow()` will erase pre-rendered DSD content.
* DSD is parser-only, so tests that inject HTML through ordinary `innerHTML`
  may give false negatives.
* Repeating a full `<template shadowrootmode>` per component instance increases
  raw HTML size, although compression should reduce repeated markup cost.
* Static serialization can create false confidence if dynamic values are not
  reconciled immediately on hydration.
* CSS strategy decisions matter because constructable stylesheets cannot be
  serialized into HTML.
* Shadow DOM still has real form and accessibility boundaries.
* Old browsers need JS fallback or an explicitly chosen polyfill.

## Verification Plan

Implementation milestones should use:

```sh
cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings
cargo test --workspace
pnpm check-types
pnpm test
pnpm --filter @naos-ui/example-counter build
pnpm --filter @naos-ui/example-counter test
rg -n "TO""DO|TB""D|FIX""ME|PLACE""HOLDER" docs README.md
```

Browser-specific checks should include:

* a DSD support assertion using
  `Object.hasOwn(HTMLTemplateElement.prototype, "shadowRootMode")`;
* a prerendered fixture parsed as initial HTML, not via `innerHTML`;
* a fixture proving upgrade does not clear the declarative root;
* a fallback fixture with no declarative root;
* a delayed-JS or no-JS demo assertion that static content is visible before
  custom element upgrade.

## Source Notes

Primary references:

* [MDN `<template>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template)
* [MDN `Element.attachShadow()`](https://developer.mozilla.org/en-US/docs/Web/API/Element/attachShadow)
* [web.dev Declarative Shadow DOM](https://web.dev/articles/declarative-shadow-dom)
* [Can I Use Declarative Shadow DOM](https://caniuse.com/declarative-shadow-dom)
* [Firefox 123 release notes for developers](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/123)
* [WebKit Declarative Shadow DOM](https://webkit.org/blog/13851/declarative-shadow-dom/)
* [Web Platform DX Declarative Shadow DOM](https://web-platform-dx.github.io/web-features-explorer/features/declarative-shadow-dom/)
