# RFC 0006: Iktia Router Package

Status: Draft
Date: 2026-06-20

## Summary

Add an optional `@iktia/router` package for browser-side routing in Iktia and
plain Custom Element applications.

The package should be a small platform router, not an application framework. It
maps URLs to Custom Element views, lazy-loads route modules, manages browser
navigation, exposes route params/search state, and handles cancellation for
interrupted navigations. It must not move component semantics into
`@iktia/runtime`, introduce a React/Lit dependency, or become a data-loading
framework.

This RFC sketches the package boundary and extracts adoptable lessons from
current router/framework references:

* React Router 8 modes, route modules, progressive enhancement, cancellation,
  and view transitions:
  <https://reactrouter.com/start/modes>,
  <https://reactrouter.com/explanation/progressive-enhancement>,
  <https://reactrouter.com/explanation/race-conditions>,
  <https://reactrouter.com/how-to/view-transitions>
* TanStack Router and TanStack Start type-safe navigation, search-param
  emphasis, route context, and the boundary between router and full-stack
  framework:
  <https://tanstack.com/router/latest/docs/overview>,
  <https://tanstack.com/start/latest/docs/framework/react/overview>
* Waku file/config routing, static versus dynamic rendering config, typed route
  params, and a deliberately minimal framework posture:
  <https://waku.gg/>
* Web Component router precedents from Vaadin Router and Lit Labs Router:
  <https://github.com/vaadin/router>,
  <https://github.com/lit/lit/tree/main/packages/labs/router>
* Web platform APIs that now cover much of the baseline routing surface:
  `URLPattern`, Navigation API, and View Transition API:
  <https://developer.mozilla.org/en-US/docs/Web/API/URLPattern>,
  <https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API>,
  <https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API>

## Existing Constraints

This package must fit the accepted Iktia architecture:

* Generated Iktia output targets platform-native Custom Elements.
* `@iktia/runtime` remains a tiny platform-helper runtime.
* Public package boundaries should keep component semantics out of
  `@iktia/runtime`.
* `@iktia/primitives` owns primitive behavior, CSS, parts, slots, state
  attributes, accessibility behavior, and events.
* Framework compatibility happens through native Custom Elements and DOM APIs,
  not through React, Lit, Vue, Solid, or adapter runtimes.
* The docs site can continue using React Router as an application framework;
  that does not imply React Router belongs in Iktia public runtime packages.

## Decision

Create `@iktia/router` as a separate optional package if routing graduates from
design sketch to implementation.

The package should be described as:

> A tiny platform router for Custom Element applications.

It should not be described as:

> A full-stack framework, a data router, or the Iktia app runtime.

## Goals

* Keep routing outside `@iktia/core`, `@iktia/runtime`, and
  `@iktia/primitives`.
* Use ordinary DOM elements and browser navigation primitives.
* Prefer `URLPattern` for route matching, with a small compatibility fallback
  only if the support matrix requires it.
* Use same-origin `<a href>` progressive enhancement: links remain normal
  anchors when JavaScript is absent or not yet loaded.
* Support lazy route module loading with `import()`.
* Provide route params, search params, the current URL, navigation type, and an
  `AbortSignal` to mounted route elements.
* Cancel interrupted navigations and prevent stale async results from committing.
* Provide active-link state for ordinary anchors.
* Provide optional View Transition API integration without requiring animations.
* Keep the first implementation compatible with any Custom Element authoring
  source, including Iktia-generated elements and hand-written elements.
* Leave a later path for typed route manifests and route generation without
  making the first router slice depend on compiler work.

## Non-Goals

* Do not depend on React Router, TanStack Router, Waku, Lit, Vaadin Router, or a
  framework runtime.
* Do not add route modules, loaders, actions, fetchers, sessions, cookies,
  server functions, or backend-for-frontend conventions in the first slice.
* Do not own application data caching. Route elements or app-level data layers
  should own data fetching and cache invalidation.
* Do not implement SSR, SSG, RSC, server actions, or streaming in
  `@iktia/router`.
* Do not add file-system routing in the first slice.
* Do not introduce an `iktia-link` element as the primary navigation primitive.
  Ordinary anchors are the public baseline.
* Do not make the router a dependency of generated components or primitives.

## Surveyed Learnings

### React Router 8

React Router now presents three additive modes: Declarative, Data, and
Framework. The useful learning for Iktia is the mode split, not the React API.
Simple URL-to-view routing should stay separate from data loading and framework
conventions.

Adopt:

* progressive enhancement around normal anchors;
* cancellation semantics for interrupted navigations;
* explicit pending/navigation state;
* optional view-transition integration;
* a route table that lives outside component render.

Avoid:

* React components, hooks, `RouterProvider`, and `Outlet`;
* framework route modules as the public Iktia router contract;
* loaders/actions/fetchers as a first-slice data framework;
* server conventions in the browser router package.

### TanStack Router and TanStack Start

TanStack Router shows that router APIs can be much safer when paths, params,
search params, and navigation calls are typed from the same route definition.
TanStack Start shows the opposite boundary: once SSR, streaming, server
functions, middleware, and deployment builds are included, the product is a
full-stack framework.

Adopt:

* typed route definitions as a design direction;
* typed URL construction and param extraction where TypeScript can infer it;
* first-class search param parsing as an optional layer;
* route context as a later feature, if it can remain DOM-native.

Avoid:

* cache ownership in the router;
* inherited route context as a hidden component-tree runtime;
* Start-like server functions, server routes, middleware, and full-stack builds.

### Waku

Waku is useful as a small-framework reference: route definitions can be simple,
layouts matter, and static versus dynamic rendering choices should be explicit.
Its React Server Component model does not transfer to Iktia, but its restraint is
relevant.

Adopt:

* simple route configuration before broad framework scope;
* a clear distinction between static app shells and dynamic route views;
* typed route params as a desirable DX target;
* route grouping/layout lessons for a later nested routing milestone.

Avoid:

* React Server Components;
* `'use client'` / server-client boundary semantics;
* file-system routing as the first public contract.

### Vaadin Router and Lit Labs Router

Vaadin Router proved that a framework-agnostic Web Component router can map
paths directly to Custom Element tags. It is now deprecated, so it should be a
historical reference rather than a dependency.

Lit Labs Router uses `URLPattern`, route callbacks, outlets, and component-owned
route controllers. It is Lit-specific and Labs-status, so it should be design
inspiration rather than an Iktia dependency.

Adopt:

* Custom Element tags as routable view targets;
* route params passed to view creation;
* nested/outlet ideas for later evaluation;
* `URLPattern` as the matching primitive.

Avoid:

* Lit reactive controllers;
* Vaadin Router as a runtime dependency;
* component-library-specific lifecycle coupling.

### Web Platform APIs

`URLPattern` is now broadly available enough to be the natural route matcher.
The Navigation API is aimed at SPA navigation handling and can become the
preferred interception backend, but the router should still support a History
API fallback until the target browser policy accepts Navigation API-only
routing. The View Transition API should be optional sugar around route commits.

Adopt:

* `URLPattern` for route matching and named params;
* Navigation API interception where available;
* History API click/popstate fallback;
* optional `document.startViewTransition()` wrapping for commits.

Avoid:

* hiding browser navigation behavior behind custom elements only;
* requiring View Transitions for correctness;
* relying on Navigation API without a fallback in the first slice.

## Proposed Public Shape

The first API should be object-based and framework-free:

```ts
import { createRouter, defineRoutes } from "@iktia/router"

const routes = defineRoutes([
  {
    path: "/",
    tag: "app-home",
    load: () => import("./routes/app-home.js"),
  },
  {
    path: "/products/:id",
    tag: "app-product",
    load: () => import("./routes/app-product.js"),
    props({ params }) {
      return { productId: params.id }
    },
  },
  {
    path: "/settings",
    tag: "app-settings",
    load: () => import("./routes/app-settings.js"),
  },
])

const router = createRouter({
  outlet: document.querySelector("[data-app-outlet]")!,
  routes,
  notFound: {
    tag: "app-not-found",
    load: () => import("./routes/app-not-found.js"),
  },
})

router.start()
```

Route records:

```ts
export type IktiaRoute = {
  readonly path: string
  readonly tag: string
  readonly load?: (navigation: IktiaNavigation) => Promise<unknown>
  readonly props?: (match: IktiaRouteMatch) => Record<string, unknown>
  readonly attrs?: (match: IktiaRouteMatch) => Record<string, string | null>
  readonly canEnter?: (
    match: IktiaRouteMatch,
  ) => boolean | string | URL | Promise<boolean | string | URL>
  readonly title?: string | ((match: IktiaRouteMatch) => string)
}
```

Navigation state:

```ts
export type IktiaNavigation = {
  readonly id: number
  readonly url: URL
  readonly from: URL | null
  readonly type: "push" | "replace" | "traverse" | "load"
  readonly signal: AbortSignal
}

export type IktiaRouteMatch = {
  readonly route: IktiaRoute
  readonly url: URL
  readonly params: Readonly<Record<string, string>>
  readonly search: URLSearchParams
  readonly navigation: IktiaNavigation
}
```

Mounted route elements receive:

* `element.iktiaRoute = match`
* properties returned by `props(match)`
* attributes returned by `attrs(match)`

The `iktiaRoute` property is intentionally a plain property, not an attribute,
because it contains object state and an `AbortSignal`.

## Navigation Behavior

The router should intercept only navigations that are safe for SPA handling:

* same-origin URLs;
* left-click anchors without modifier keys;
* anchors without `target`, `download`, or external protocol behavior;
* programmatic `router.navigate()` calls.

All other navigation should fall through to the browser.

The router should expose:

```ts
router.navigate("/products/123")
router.replace("/products/123")
router.back()
router.forward()
router.reload()
router.href("/products/:id", { id: "123" })
router.prefetch("/products/123")
router.stop()
```

`router.href()` is the first place to explore path-param type inference. If that
becomes too expensive for the first slice, it can initially be an untyped helper
and graduate later through `defineRoutes()`.

## Cancellation and Stale Commit Rules

Each navigation gets an incrementing id and an `AbortController`.

When a new navigation starts:

* abort the previous navigation if it has not committed;
* create a new `AbortSignal`;
* pass the signal to route `load()`, `canEnter()`, and the mounted element's
  `iktiaRoute`;
* commit only if the navigation id is still current when async work completes.

This mirrors browser document navigation behavior and the modern React Router
lesson: interrupted navigation should not let old async results overwrite the
new screen.

## Active Links

The router should not require a link component. It should update ordinary
anchors within a configured root:

```html
<a href="/products" data-iktia-active-match="prefix">Products</a>
<a href="/settings" data-iktia-active-match="exact">Settings</a>
```

When active, the router sets:

* `data-active=""`;
* `aria-current="page"` for exact active links;
* optional configured class names if the host app requests them.

## Events

The router instance should extend or wrap `EventTarget`.

Initial events:

* `iktia:navigationstart`
* `iktia:navigationcommit`
* `iktia:navigationabort`
* `iktia:navigationerror`
* `iktia:routechange`

Events should also be dispatched from the outlet as composed `CustomEvent`s so
host applications and route elements can observe them through DOM wiring.

## Nested Routing

Nested routes are valuable, but they should not be in the first slice unless a
specific app requirement appears before implementation.

The later design should prefer DOM outlets over a resident component tree:

```html
<app-layout>
  <main data-iktia-router-outlet></main>
</app-layout>
```

The parent route mounts first. If the matched child route needs an outlet, the
router looks for `[data-iktia-router-outlet]` inside the parent route element's
light DOM or shadow root. This keeps layout composition DOM-native while still
allowing React Router/TanStack/Waku-style layout reuse.

Open issue for that milestone: whether searching a route element's shadow root
for nested outlets violates encapsulation expectations. A safer alternative is
an explicit `outlet(element, match)` callback on the parent route record.

## Search Params

The first slice should expose `URLSearchParams` directly. It should not parse or
serialize JSON search state by default.

Later, `@iktia/router` can add typed search schemas:

```ts
{
  path: "/products",
  tag: "app-products",
  search: {
    page: numberParam({ default: 1 }),
    q: stringParam(),
    tags: stringArrayParam(),
  },
}
```

This adopts the TanStack lesson that search params are application state, but it
keeps v0 small and avoids committing to a schema library too early.

## Guards and Redirects

The first slice may include a minimal `canEnter()` hook because authentication
and redirects are common at the routing boundary.

Rules:

* `true` allows the route.
* `false` cancels and leaves the current route in place.
* `string` or `URL` redirects.
* thrown errors go through `iktia:navigationerror` and the configured error
  route.

`canEnter()` must not become a data-loader substitute. It should answer whether
navigation may proceed, not fetch page data.

## View Transitions

The router can support:

```ts
router.navigate("/about", { viewTransition: true })
```

and:

```html
<a href="/about" data-iktia-view-transition>About</a>
```

When enabled and `document.startViewTransition` exists, the router wraps the
route commit. If the API is missing, navigation still commits normally.

## Package Boundary

Package dependencies should be empty or near-empty.

Expected package:

```json
{
  "name": "@iktia/router",
  "description": "Tiny platform router for Custom Element applications.",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "types": "./dist/index.d.mts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

The router should not depend on `@iktia/primitives`. It may depend on
`@iktia/runtime` only if a helper is already accepted as a general platform
helper. The preferred first implementation is dependency-free.

## Milestone Plan

### M0: Review RFC

* Review this package boundary.
* Decide whether `@iktia/router` is in scope for v0.1 or post-v0.1.
* Confirm the browser support policy for `URLPattern`, Navigation API fallback,
  and View Transition API.

### M1: Matching and Mounting Prototype

* Add package wiring for `@iktia/router`.
* Implement `defineRoutes()`, `createRouter()`, `URLPattern` matching, and route
  element mounting.
* Pass `iktiaRoute`, `props`, and `attrs` to mounted elements.
* Add unit tests for match order, params, not found, and stale commit handling.

### M2: Browser Navigation

* Add same-origin anchor interception.
* Add History API popstate handling.
* Use Navigation API interception when available.
* Add active-link updates.
* Add browser tests around click, back, forward, replace, and fallback behavior.

### M3: Async and Errors

* Add lazy `load()` support.
* Add abort semantics and stale-result guards.
* Add `canEnter()` redirects.
* Add navigation events and error route support.

### M4: Developer Experience

* Add `router.href()` and initial type inference.
* Add docs and a small Custom Element demo.
* Add optional View Transition API integration.
* Reassess typed search schemas and nested outlets after real demo usage.

## Risks

* Router scope can easily expand into an app framework. The package must keep
  data, server, and rendering concerns out of the first slice.
* Typed route inference can consume a lot of type-system complexity. It should
  be introduced only where the public API remains understandable.
* Navigation API behavior is improving quickly. The implementation should keep a
  small backend boundary so History API fallback and Navigation API interception
  can evolve independently.
* Nested route outlets can conflict with Shadow DOM encapsulation. The first
  slice should avoid nested routing unless the outlet contract is explicit.
* A route-element `iktiaRoute` property is ergonomic, but it is not visible in
  HTML. Docs must explain how route elements receive non-serializable state.

## Open Questions

* Is `@iktia/router` a v0.1 package or a post-v0.1 package?
* Should the first public route target be `tag`, `createElement`, or both?
* Should route params be assigned only through `iktiaRoute`, or should the
  router provide a default attribute mapping for string params?
* Should `canEnter()` exist in the first implementation, or should redirects be
  handled by route elements initially?
* Should the docs site eventually dogfood `@iktia/router`, or should it stay on
  React Router because it is a React documentation app?

## Recommendation

Accept `@iktia/router` as a separate optional package direction, but keep the
first implementation deliberately smaller than React Router Data Mode,
TanStack Router, Waku, Lit Labs Router, and Vaadin Router.

The strongest first slice is:

* `URLPattern` route matching;
* Custom Element tag mounting;
* lazy imports;
* ordinary anchor interception;
* params/search exposure;
* abortable navigation;
* active links;
* not-found/error handling.

Everything else, especially nested layouts, typed search schemas, file routing,
and SSR/SSG, should wait until the basic package has been validated in a real
Iktia demo.
