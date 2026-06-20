import { describe, expect, it } from "vitest"

import { createRouter, defineRoutes, type IktiaRouteMatch } from "./index.js"

function setupRouter() {
  document.body.innerHTML = `
    <nav>
      <a href="/" data-home data-iktia-active-match="exact">Home</a>
      <a href="/products/42?tab=details" data-product data-iktia-active-match="prefix">Product</a>
    </nav>
    <main data-outlet></main>
  `

  class AppHome extends HTMLElement {}
  class AppProduct extends HTMLElement {
    productId = ""
  }
  class AppNotFound extends HTMLElement {}

  if (!customElements.get("app-home")) customElements.define("app-home", AppHome)
  if (!customElements.get("app-product")) customElements.define("app-product", AppProduct)
  if (!customElements.get("app-not-found")) customElements.define("app-not-found", AppNotFound)

  const routes = defineRoutes([
    {
      path: "/",
      tag: "app-home",
      title: "Home",
    },
    {
      path: "/products/:id",
      tag: "app-product",
      props({ params }) {
        return { productId: params.id }
      },
      attrs({ params }) {
        return { "data-product-id": params.id ?? "" }
      },
      title({ params }) {
        return `Product ${params.id}`
      },
    },
  ] as const)

  const outlet = document.querySelector("[data-outlet]")
  if (!outlet) throw new Error("Missing test outlet.")

  const router = createRouter({
    outlet,
    routes,
    notFound: {
      tag: "app-not-found",
      title: "Missing",
    },
  })

  return { outlet, router }
}

describe("IktiaRouter", () => {
  it("matches route params and builds typed hrefs", () => {
    const { router } = setupRouter()

    expect(router.href("/products/:id", { id: "abc 123" }, {
      search: { tab: "details" },
    })).toBe("/products/abc%20123?tab=details")

    const match = router.match("/products/42?tab=details")
    expect(match?.params).toEqual({ id: "42" })
    expect(match?.search.get("tab")).toBe("details")
  })

  it("matches optional and wildcard params with the fallback matcher", () => {
    document.body.innerHTML = `<main data-outlet></main>`
    class AppDocs extends HTMLElement {}
    class AppFiles extends HTMLElement {}
    if (!customElements.get("app-docs")) customElements.define("app-docs", AppDocs)
    if (!customElements.get("app-files")) customElements.define("app-files", AppFiles)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")
    const router = createRouter({
      outlet,
      routes: defineRoutes([
        { path: "/docs/:section?", tag: "app-docs" },
        { path: "/files/:path*", tag: "app-files" },
      ] as const),
    })

    expect(router.match("/docs")?.params).toEqual({})
    expect(router.match("/docs/api")?.params).toEqual({ section: "api" })
    expect(router.match("/files/guides/router")?.params).toEqual({ path: "guides/router" })
  })

  it("mounts custom element route views and updates active anchors", async () => {
    const { outlet, router } = setupRouter()
    const commits: IktiaRouteMatch[] = []
    router.addEventListener("iktia:navigationcommit", (event) => {
      commits.push((event as CustomEvent<{ match: IktiaRouteMatch }>).detail.match)
    })

    await router.navigate("/products/42?tab=details")

    const element = outlet.firstElementChild as HTMLElement & {
      iktiaRoute?: IktiaRouteMatch
      productId?: string
    }
    expect(element.tagName.toLowerCase()).toBe("app-product")
    expect(element.productId).toBe("42")
    expect(element.getAttribute("data-product-id")).toBe("42")
    expect(element.iktiaRoute?.params).toEqual({ id: "42" })
    expect(document.title).toBe("Product 42")
    expect(document.querySelector("[data-product]")?.hasAttribute("data-active")).toBe(true)
    expect(commits).toHaveLength(1)
  })

  it("does not abort a committed navigation when navigating again", async () => {
    const { router } = setupRouter()
    const aborts: number[] = []
    router.addEventListener("iktia:navigationabort", (event) => {
      const navigation = (event as CustomEvent<{ navigation: IktiaRouteMatch["navigation"] }>).detail.navigation
      aborts.push(navigation.id)
    })

    await router.navigate("/products/42")
    await router.navigate("/")

    expect(aborts).toHaveLength(0)
  })

  it("mounts not-found views for unmatched app URLs", async () => {
    const { outlet, router } = setupRouter()

    await router.navigate("/missing")

    expect(outlet.firstElementChild?.tagName.toLowerCase()).toBe("app-not-found")
    expect(document.title).toBe("Missing")
  })

  it("prevents stale async route loads from committing", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppSlow extends HTMLElement {}
    class AppFast extends HTMLElement {}
    if (!customElements.get("app-slow")) customElements.define("app-slow", AppSlow)
    if (!customElements.get("app-fast")) customElements.define("app-fast", AppFast)

    let resolveSlow: () => void = () => {
      throw new Error("Slow route resolver was not assigned.")
    }
    const routes = defineRoutes([
      {
        path: "/slow",
        tag: "app-slow",
        load() {
          return new Promise<void>((resolve) => {
            resolveSlow = resolve
          })
        },
      },
      {
        path: "/fast",
        tag: "app-fast",
      },
    ] as const)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")
    const router = createRouter({ outlet, routes })
    const slowNavigation = router.navigate("/slow")
    await router.navigate("/fast")

    resolveSlow()
    await slowNavigation

    expect(outlet.firstElementChild?.tagName.toLowerCase()).toBe("app-fast")
  })
})
