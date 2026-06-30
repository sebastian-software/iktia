# API Reference

This page summarizes the public v0.1 package surface. Rust crates are internal
for v0.1 and are not published to crates.io.

## Packages

| Package | Public role |
| --- | --- |
| `@naos-ui/core` | Authoring primitives and JSX runtime types. |
| `@naos-ui/data` | Optional fetch and subscription resources for Custom Element data loading. |
| `@naos-ui/data-convex` | Optional Convex adapter for `@naos-ui/data` resources. |
| `@naos-ui/motion` | Framework-free motion kernels used by generated output and primitives. |
| `@naos-ui/runtime` | Tiny platform helpers for generated output. |
| `@naos-ui/router` | Optional platform router for Custom Element app shells. |
| `@naos-ui/compiler` | Node wrapper around the native compiler. |
| `@naos-ui/compiler-*` | Platform-specific optional native compiler bindings. |
| `@naos-ui/vite` | Vite transform and prerender metadata plugin. |
| `@naos-ui/cli` | `naos compile`, `naos prerender`, and `naos info`. |

## `@naos-ui/motion`

| Export | Stability | Purpose |
| --- | --- | --- |
| `spring(presetOrOptions)` | Experimental | Resolve a spring preset or option object into browser-native duration and `linear(...)` CSS easing. |
| `springEasing(presetOrOptions)` | Experimental | Return only the generated CSS easing string. |
| `springMotionToken(options)` | Experimental | Generate a deterministic motion class name plus CSS custom-property rule for a spring token. |
| `springMotionTokenClassName(options)` | Experimental | Generate only the deterministic class name for build/runtime coordination. |
| `springMotionTokenCss(options)` | Experimental | Generate only the CSS rule for compiler or package-build output. |
| `flipMovedElements(firstRects, options?)` | Experimental | Play transform-only FLIP move animations for preserved keyed elements. |
| `waitForAnimations(element, options?)` | Experimental | Wait for pending Web Animations API animations, with reduced-motion and timeout guards. |

Motion token classes are intended for compiler or package-build CSS output. For
example, primitives can share `--naos-presence-motion-*` variables through a
stable class without injecting inline `style` strings at render time.

## `@naos-ui/core`

| Export | Stability | Purpose |
| --- | --- | --- |
| `state(initialValue)` | Public | Writable local component state. |
| `computed(() => value)` | Public | Read-only derived value. |
| `effect(() => cleanup?)` | Public | Lifecycle-aware side effect with optional cleanup. |
| `event<Detail>(name)` | Public | Typed `CustomEvent` dispatcher. |
| `on(name, handler, options?)` | Public | Typed DOM listener helper with invocation-scoped abort signals. |
| `host()` | Public | Current element, root, props, lifecycle signals, and update/task handle. |
| `Show` | Public | Explicit conditional control-flow primitive. |
| `Switch` | Public | First-match-wins multi-way control-flow primitive. |
| `Match` | Public | Static branch arm for `<Switch>`, with optional trailing default. |
| `For` | Public | Item-keyed list control-flow primitive. |
| `Index` | Public | Position-keyed list control-flow primitive with item accessors. |
| `ComponentOptions` | Public | Component-level `styles` metadata. |
| `ElementRef` | Public | JSX `ref` variable or callback type for direct element access. |

Authoring primitives are compile-time APIs. They throw if a `.wc.tsx` module is
executed without the compiler transform.

Generated `state.set()` and `state.update()` calls are batched into a microtask.
Use `host().flushSync()` when a handler must observe the updated DOM
immediately after changing state. `host().update()` requests a batched update
and resolves to an `AbortSignal` for work tied to that update pass.

## `@naos-ui/data`

| Export | Stability | Purpose |
| --- | --- | --- |
| `fetchResource(key, fetcher, options?)` | Experimental | Create an abortable, cached, stale-while-revalidate resource from a fetcher. |
| `subscriptionResource(key, subscriber, options?)` | Experimental | Create a ref-counted resource from a push subscription source. |
| `ResourceCache` | Experimental | Scope resource cache, in-flight fetches, and active subscriptions. |
| `defaultResourceCache` | Experimental | Shared default cache for simple apps. |
| `normalizeResourceKey(key)` | Experimental | Convert string, tuple, or object keys into stable cache keys. |

`null`, `undefined`, and `false` keys disable a resource. Fetchers receive an
`AbortSignal`; equivalent in-flight keys are deduped; cached data is retained as
stale while revalidation runs. Subscription resources share equivalent upstream
subscriptions until the final consumer is disposed.
`@naos-ui/data` intentionally has no provider SDK dependencies; provider-specific
adapters such as Convex should live in separate optional packages.

See [Data Resources](data.md) for examples and the Convex adapter direction.

## `@naos-ui/data-convex`

| Export | Stability | Purpose |
| --- | --- | --- |
| `convexResource(client, query, args, options?)` | Experimental | Create a resource from a Convex WebSocket query subscription. |
| `convexMutation(client, mutation, options?)` | Experimental | Create a typed Convex mutation caller. |
| `convexAction(client, action)` | Experimental | Create a typed Convex action caller. |
| `convexConnectionResource(client, options?)` | Experimental | Create a resource from Convex connection state. |
| `convexQueryKey(query, args)` | Experimental | Create the stable `@naos-ui/data` cache key for a Convex query. |

`@naos-ui/data-convex` depends on `@naos-ui/data` and declares `convex` as a peer
dependency. It should be installed only by apps that use Convex.

## `@naos-ui/compiler`

```ts
type TransformComponentRequest = {
  filename: string
  source: string
}

type TransformComponentResult = {
  code: string
  hasChanged: boolean
  map?: SourceMap
}

type RenderDeclarativeShadowDomRequest = {
  filename: string
  source: string
  props?: Record<string, unknown>
  inlineStyles?: Record<string, string>
}
```

Compiler failures throw `NaosCompilerError` with structured `diagnostics[]`.
Diagnostics include code, severity, message, filename, optional span, and
optional hint.

## `@naos-ui/vite`

`naos(options)` transforms accepted `.wc.tsx` modules and emits prerender
metadata by default for static HTML workflows. Set `prerender: false` only for
builds that never need Declarative Shadow DOM metadata.

## `@naos-ui/router`

`createRouter(options)` creates an optional browser-side router for Custom
Element app shells. It maps route records to native element tags or explicit
element factories, lazy-loads route modules, runs abortable route `loader`
hooks, handles explicit `data-naos-action` forms through route `action` hooks,
exposes `naosRoute` with params, search params, loader data, action data, URL,
navigation type, and `AbortSignal`, intercepts same-origin anchors, updates
active-link attributes, restores scroll and focus after route commits, emits
route/action events, and mounts not-found or error routes.

```ts
const routes = defineRoutes([
  { path: "/", tag: "app-home" },
  {
    path: "/products/:id",
    tag: "app-product",
    loader: ({ params }) => fetch(`/api/products/${params.id}`).then((response) => response.json()),
    action: ({ formData }) => saveProduct(formData),
    focusTarget: "h1,[autofocus]",
  },
])
```

`scrollRestoration` is enabled by default. Push/replace navigations scroll to
the top or hash target, traverse navigations restore the recorded position, and
same-page hash links remain native browser fragment navigation. Apps can pass a
custom `scrollRestoration.getKey({ url, state, navigation })`, disable the
feature with `scrollRestoration: false`, or skip it per navigation with
`router.navigate("/path", { scroll: false })`.

`focusRestoration` is also enabled by default. After a committed navigation,
focus moves to a route `focusTarget` selector or callback, then `[autofocus]`,
`main`, the first heading, or the outlet. Apps can disable it globally with
`focusRestoration: false` or per navigation with `{ focus: false }`. Prefer a
real page heading or primary landmark as the focus target so keyboard and screen
reader users get a clear route-change point.

The router emits `naos:navigationstart`, `naos:navigationcommit`,
`naos:navigationabort`, `naos:navigationerror`, `naos:routechange`,
`naos:actionstart`, `naos:actioncommit`, and `naos:actionerror` from the
router and the outlet.

The package has no React, Next.js, TanStack Router, Angular, Lit, Vaadin Router,
Waku, or virtual DOM runtime dependency and is not used by generated components
unless an app imports it. It does not own application caching, sessions,
cookies, SSR, or backend routing.

## `@naos-ui/cli`

| Command | Purpose |
| --- | --- |
| `naos compile <input>` | Transform one `.wc.tsx` module to JavaScript. |
| `naos prerender <input>` | Emit Declarative Shadow DOM host HTML. |
| `naos info` | Print platform and native compiler metadata. |

See [CLI](cli.md) for options and examples.
