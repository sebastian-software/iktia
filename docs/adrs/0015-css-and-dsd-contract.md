# ADR 0015: CSS And Declarative Shadow DOM Contract

Status: Accepted

Weight: P1

## Context

The MVP supports inline `styles: [...]` strings and explicit Declarative Shadow
DOM prerendering. v0.1 needs a public styling story that works with Vite,
Shadow DOM, static HTML, and the no-framework-runtime constraint.

Vite already supports importing CSS as a string with `?inline`. Iktia does not
need to own CSS graph resolution in v0.1.

## Decision

Use Vite `?inline` CSS text imports for v0.1:

```ts
import css from "./button.css?inline"

export const options = {
  styles: [css],
} satisfies ComponentOptions
```

Iktia injects style strings as `<style>` elements in imperative Shadow DOM and
Declarative Shadow DOM output.

The v0.1 CSS contract is flat:

* no Iktia CSS graph;
* no CSS Modules contract;
* no Sass contract;
* no PostCSS contract;
* no constructable stylesheet contract;
* no custom Iktia CSS helper.

Theming should use CSS custom properties. Host pages can set custom properties
on the element or ancestors, and component CSS can consume them with `var()`.

Declarative Shadow DOM is public only through explicit prerender entry points:

* `renderDeclarativeShadowDom()` in `@iktia/compiler`;
* `iktia prerender` in `@iktia/cli`;
* default Vite metadata for static site and demo builds.

Normal client builds do not use a public `ComponentOptions.dsd` flag.
`data-iktia-*` hydration markers are internal generated markup and are not
semver-protected. Development hydration mismatches throw structured
diagnostics. Production hydration mismatches remount imperatively.

## Alternatives

* Add an Iktia `css("./file.css")` helper.
* Treat normal `.css` imports as component-scoped text.
* Use Shadow Root `<link rel="stylesheet">` URLs.
* Add constructable stylesheets for v0.1.
* Add a public `ComponentOptions.dsd` flag.

## Consequences

* Styling stays aligned with Vite instead of inventing a new asset model.
* CSS features not handled by Vite `?inline` remain outside the v0.1 contract.
* DSD remains an explicit static/prerender workflow, with Vite metadata enabled
  by default and `prerender: false` as the opt-out.
* Generated markers can change without semver impact as long as behavior holds.

## Related Milestones

v0.1 M4, M8
