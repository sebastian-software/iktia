# `@naos-ui/router`

`@naos-ui/router` is a tiny platform router for Custom Element applications.

It maps URLs to native elements, lazy-loads route modules, runs abortable route
loaders and FormData actions, exposes route params and search params, intercepts
ordinary same-origin anchors and explicit action forms, updates active link
state, restores scroll and focus after route commits, emits route events, and
cancels stale async navigations.

```ts
import { createRouter, defineRoutes, redirect } from "@naos-ui/router"

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
    loader: ({ params }) => fetch(`/api/products/${params.id}`).then((response) => response.json()),
    action: async ({ formData, params }) => {
      await fetch(`/api/products/${params.id}`, {
        body: formData,
        method: "POST",
      })
      return redirect(`/products/${params.id}`, { replace: true })
    },
    props({ params }) {
      return { productId: params.id }
    },
    focusTarget: "h1,[autofocus]",
  },
])

createRouter({
  focusRestoration: true,
  outlet: document.querySelector("[data-app-outlet]")!,
  routes,
  scrollRestoration: {
    getKey: ({ url }) => `${url.pathname}${url.search}`,
  },
}).start()
```

Route elements receive `element.naosRoute`, including `params`, `search`,
`data`, `actionData`, the current `URL`, and the navigation `AbortSignal`.
Native forms opt into action handling with `data-naos-action`.

The router defaults to browser-native app navigation behavior: new route commits
scroll to the top or hash target, back/forward restores the previous scroll
position, and focus moves to the route `focusTarget`, then `[autofocus]`, `main`,
the first heading, or the outlet. Apps that own this behavior can pass
`scrollRestoration: false`, `focusRestoration: false`, or per-navigation
`{ scroll: false, focus: false }`. Same-page hash links still fall through to
native fragment navigation.

Route events are dispatched from the router and the outlet:
`naos:navigationstart`, `naos:navigationcommit`, `naos:navigationabort`,
`naos:navigationerror`, `naos:routechange`, `naos:actionstart`,
`naos:actioncommit`, and `naos:actionerror`.

The package is optional. It is not a dependency of generated Naos components,
`@naos-ui/runtime`, or `@naos-ui/primitives`, and it does not depend on React,
Next.js, TanStack Router, Angular, Lit, or a virtual DOM runtime.
