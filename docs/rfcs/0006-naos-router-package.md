# RFC 0006: Naos Router Package

Status: Draft
Date: 2026-06-20

## Summary

Add an optional `@naos-ui/router` package for browser-side routing in Naos and
plain Custom Element applications.

The package should be a small platform router, not an application framework. It
maps URLs to Custom Element views, lazy-loads route modules, manages browser
navigation, exposes route params/search state, and handles cancellation for
interrupted navigations. It must not move component semantics into
`@naos-ui/runtime`, introduce a React/Lit dependency, or become a data-loading
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

This package must fit the accepted Naos architecture:

* Generated Naos output targets platform-native Custom Elements.
* `@naos-ui/runtime` remains a tiny platform-helper runtime.
* Public package boundaries should keep component semantics out of
  `@naos-ui/runtime`.
* `@naos-ui/primitives` owns primitive behavior, CSS, parts, slots, state
  attributes, accessibility behavior, and events.
* Framework compatibility happens through native Custom Elements and DOM APIs,
  not through React, Lit, Vue, Solid, or adapter runtimes.
* The docs site can continue using React Router as an application framework;
  that does not imply React Router belongs in Naos public runtime packages.

## Decision

Create `@naos-ui/router` as a separate optional package if routing graduates from
design sketch to implementation.

The package should be described as:

> A tiny platform router for Custom Element applications.

It should not be described as:

> A full-stack framework, a data router, or the Naos app runtime.

## Goals

* Keep routing outside `@naos-ui/core`, `@naos-ui/runtime`, and
  `@naos-ui/primitives`.
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
  source, including Naos-generated elements and hand-written elements.
* Leave a later path for typed route manifests and route generation without
  making the first router slice depend on compiler work.

## Non-Goals

* Do not depend on React Router, TanStack Router, Waku, Lit, Vaadin Router, or a
  framework runtime.
* Do not add framework route modules, fetchers, sessions, cookies, server
  functions, or backend-for-frontend conventions in the first slice.
* Do not own application data caching. Thin route loaders and actions may pass
  data into route elements, but route elements or app-level data layers should
  own cache policy and invalidation.
* Do not implement SSR, SSG, RSC, server actions, or streaming in
  `@naos-ui/router`.
* Do not add file-system routing in the first slice.
* Do not introduce an `naos-link` element as the primary navigation primitive.
  Ordinary anchors are the public baseline.
* Do not make the router a dependency of generated components or primitives.

## Surveyed Learnings

### Feature Comparison Snapshot

| Feature axis | `@naos-ui/router` first slice | React Router 8 | TanStack Router | TanStack Start | Waku |
| --- | --- | --- | --- | --- | --- |
| Runtime target | Browser platform and Custom Elements | React router/framework modes | React route tree | Full-stack React framework | Minimal React framework |
| Route contract | Explicit route objects mapping paths to Custom Element tags | Declarative, Data, or Framework route APIs | Code-based or file-based route tree | TanStack Router plus server build/runtime conventions | File-based or config-based pages and layouts |
| View target | Native Custom Element instance in a DOM outlet | React components and outlets | React components and nested outlets | React components across client/server builds | React Server and Client Components |
| Link handling | Ordinary same-origin anchors with History fallback | `<Link>`, `<NavLink>`, forms, and progressive enhancement | Typed `Link`/navigation APIs | Framework navigation on top of TanStack Router | `<Link />` plus router hook |
| Loaders and pre-render data | Thin browser-side `loader()` result exposed as `match.data` | Data/Framework loaders, pending UI, revalidation | Loader lifecycle, prefetching, and built-in cache | Router data plus SSR, streaming, and server functions | Server component data fetching plus static/dynamic render config |
| Mutations and forms | `action()` for `router.submit()` and explicit `data-naos-action` forms | Data/Framework actions, forms, fetchers, and revalidation | Data loading focused; app data layer usually owns mutations | Server functions, server routes, middleware, and full-stack type safety | React actions/mutations across the server-client boundary |
| Type safety | Runtime params/search now; typed route manifest later | Framework mode adds type-safe hrefs and route modules | Core design strength: inferred params, search, route context, and navigation | End-to-end type safety across client/server | Typed page params through route helpers |
| Cache/session ownership | Out of scope; apps own cache policy | Data APIs include fetchers, sessions, cookies, and related helpers | Built-in router cache and data lifecycle APIs | Full-stack request, middleware, and server data conventions | Framework-owned render/data boundary |
| Layouts and nesting | Later milestone | Outlets and nested routes | Nested/layout/grouped routes | Full app layouts through TanStack Router | Layout files, groups, and nested segments |
| Server rendering scope | Out of scope | Available in Framework mode | SSR supported | Primary framework feature | Static prerendering, SSR, and RSC |

The useful position for Naos is the small middle: keep enough Data Mode flavor
to make Custom Element routes productive, but stop before the router owns cache
policy, server contracts, file-system routing, or a React-shaped component tree.

### React Router 8

React Router now presents three additive modes: Declarative, Data, and
Framework. The useful learning for Naos is the mode split, not the React API.
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
* framework route modules as the public Naos router contract;
* fetchers, sessions, cookies, and loaders/actions as a full data framework;
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
Its React Server Component model does not transfer to Naos, but its restraint is
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
inspiration rather than an Naos dependency.

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
import { createRouter, defineRoutes } from "@naos-ui/router"

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
export type NaosRoute = {
  readonly path: string
  readonly tag?: string
  readonly createElement?: (match: NaosRouteMatch) => HTMLElement
  readonly action?: (args: NaosActionArgs) => Promise<unknown> | unknown
  readonly loader?: (args: NaosLoaderArgs) => Promise<unknown> | unknown
  readonly load?: (navigation: NaosNavigation) => Promise<unknown>
  readonly focusTarget?: string | ((match: NaosRouteMatch) => Element | null | undefined)
  readonly props?: (match: NaosRouteMatch) => Record<string, unknown>
  readonly attrs?: (match: NaosRouteMatch) => Record<string, string | null>
  readonly canEnter?: (
    match: NaosRouteMatch,
  ) => boolean | string | URL | Promise<boolean | string | URL>
  readonly title?: string | ((match: NaosRouteMatch) => string)
}
```

Navigation state:

```ts
export type NaosNavigation = {
  readonly id: number
  readonly url: URL
  readonly from: URL | null
  readonly type: "action" | "load" | "push" | "replace" | "traverse"
  readonly signal: AbortSignal
}

export type NaosRouteMatch = {
  readonly actionData?: unknown
  readonly data?: unknown
  readonly route: NaosRoute
  readonly url: URL
  readonly params: Readonly<Record<string, string>>
  readonly search: URLSearchParams
  readonly navigation: NaosNavigation
}
```

Mounted route elements receive:

* `element.naosRoute = match`
* properties returned by `props(match)`
* attributes returned by `attrs(match)`

The `naosRoute` property is intentionally a plain property, not an attribute,
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
  `naosRoute`;
* commit only if the navigation id is still current when async work completes.

This mirrors browser document navigation behavior and the modern React Router
lesson: interrupted navigation should not let old async results overwrite the
new screen.

## Active Links

The router should not require a link component. It should update ordinary
anchors within a configured root:

```html
<a href="/products" data-naos-active-match="prefix">Products</a>
<a href="/settings" data-naos-active-match="exact">Settings</a>
```

When active, the router sets:

* `data-active=""`;
* `aria-current="page"` for exact active links;
* optional configured class names if the host app requests them.

## Events

The router instance should extend or wrap `EventTarget`.

Initial events:

* `naos:navigationstart`
* `naos:navigationcommit`
* `naos:navigationabort`
* `naos:navigationerror`
* `naos:routechange`

Events should also be dispatched from the outlet as composed `CustomEvent`s so
host applications and route elements can observe them through DOM wiring.

## Nested Routing

Nested routes are valuable, but they should not be in the first slice unless a
specific app requirement appears before implementation.

The later design should prefer DOM outlets over a resident component tree:

```html
<app-layout>
  <main data-naos-router-outlet></main>
</app-layout>
```

The parent route mounts first. If the matched child route needs an outlet, the
router looks for `[data-naos-router-outlet]` inside the parent route element's
light DOM or shadow root. This keeps layout composition DOM-native while still
allowing React Router/TanStack/Waku-style layout reuse.

Open issue for that milestone: whether searching a route element's shadow root
for nested outlets violates encapsulation expectations. A safer alternative is
an explicit `outlet(element, match)` callback on the parent route record.

## Search Params

The first slice should expose `URLSearchParams` directly. It should not parse or
serialize JSON search state by default.

Later, `@naos-ui/router` can add typed search schemas:

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
* thrown errors go through `naos:navigationerror` and the configured error
  route.

`canEnter()` must not become a data-loader substitute. It should answer whether
navigation may proceed, not fetch page data.

## Loaders and Actions

The first router slice may include thin browser-side route loaders and actions
without becoming a data framework.

Rules:

* `load()` lazy-loads route modules and may be cached per route.
* `loader()` runs for navigation and revalidation, receives params, search,
  URL, a GET `Request`, and the navigation `AbortSignal`, and returns
  `match.data`.
* `action()` runs for `router.submit()` or explicit `data-naos-action` forms,
  receives `FormData`, method, submitter, URL, params, and an action `Request`,
  and returns `match.actionData`.
* `redirect(to)` is the only router-owned action redirect shape.
* GET forms produce normal URL navigation with serialized form data.

The router must not add app-wide cache semantics, fetcher APIs, optimistic
state, sessions, cookies, server functions, or file-system route conventions.

## View Transitions

The router can support:

```ts
router.navigate("/about", { viewTransition: true })
```

and:

```html
<a href="/about" data-naos-view-transition>About</a>
```

When enabled and `document.startViewTransition` exists, the router wraps the
route commit. If the API is missing, navigation still commits normally.

## Scroll And Focus Restoration

The router owns the default app-navigation affordances that browsers normally
provide for document navigations:

* new push/replace navigations scroll to the top or to the URL hash target;
* traverse navigations restore the saved scroll position for the history entry;
* same-page hash links continue to fall through to native fragment navigation;
* focus moves after a committed route change.

The public surface should stay DOM-native:

```ts
createRouter({
  outlet,
  routes,
  scrollRestoration: {
    getKey: ({ url }) => `${url.pathname}${url.search}`,
  },
  focusRestoration: true,
})

router.navigate("/products/123", { scroll: false, focus: false })
```

Route records may provide `focusTarget` as a selector or callback. If it does
not resolve, the router falls back to `[autofocus]`, `main`, the first heading,
and then the outlet. This gives keyboard and assistive-technology users a
predictable route-change focus point without requiring a framework link
component.

Apps that fully own restoration can pass `scrollRestoration: false`,
`focusRestoration: false`, or disable either behavior per navigation.

## Package Boundary

Package dependencies should be empty or near-empty.

Expected package:

```json
{
  "name": "@naos-ui/router",
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

The router should not depend on `@naos-ui/primitives`. It may depend on
`@naos-ui/runtime` only if a helper is already accepted as a general platform
helper. The preferred first implementation is dependency-free.

## Milestone Plan

### M0: Review RFC

* Review this package boundary.
* Decide whether `@naos-ui/router` is in scope for v0.1 or post-v0.1.
* Confirm the browser support policy for `URLPattern`, Navigation API fallback,
  and View Transition API.

### M1: Matching and Mounting Prototype

* Add package wiring for `@naos-ui/router`.
* Implement `defineRoutes()`, `createRouter()`, `URLPattern` matching, and route
  element mounting.
* Pass `naosRoute`, `props`, and `attrs` to mounted elements.
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
* A route-element `naosRoute` property is ergonomic, but it is not visible in
  HTML. Docs must explain how route elements receive non-serializable state.

## Open Questions

* Is `@naos-ui/router` a v0.1 package or a post-v0.1 package?
* Should the first public route target be `tag`, `createElement`, or both?
* Should route params be assigned only through `naosRoute`, or should the
  router provide a default attribute mapping for string params?
* Should `canEnter()` exist in the first implementation, or should redirects be
  handled by route elements initially?
* Should the docs site eventually dogfood `@naos-ui/router`, or should it stay on
  React Router because it is a React documentation app?

## Recommendation

Accept `@naos-ui/router` as a separate optional package direction, but keep the
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
Naos demo.
