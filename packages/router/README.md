# `@iktia/router`

`@iktia/router` is a tiny platform router for Custom Element applications.

It maps URLs to native elements, lazy-loads route modules, exposes route params
and search params, intercepts ordinary same-origin anchors, updates active link
state, and cancels stale async navigations.

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
])

createRouter({
  outlet: document.querySelector("[data-app-outlet]")!,
  routes,
}).start()
```

The package is optional. It is not a dependency of generated Iktia components,
`@iktia/runtime`, or `@iktia/primitives`.
