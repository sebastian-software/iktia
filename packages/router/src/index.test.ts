import { describe, expect, it } from "vitest"

import { createRouter, defineRoutes, redirect, type IktiaRouteMatch } from "./index.js"

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

  it("runs route loaders before mounting and exposes loader data", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppLoaded extends HTMLElement {
      routeData: unknown
    }
    if (!customElements.get("app-loaded")) customElements.define("app-loaded", AppLoaded)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    const router = createRouter({
      outlet,
      routes: defineRoutes([
        {
          path: "/loaded/:id",
          tag: "app-loaded",
          loader({ params, request, search }) {
            expect(request.method).toBe("GET")
            return {
              id: params.id,
              tab: search.get("tab"),
            }
          },
          props({ data }) {
            return { routeData: data }
          },
          title({ data }) {
            const loaded = data as { id: string }
            return `Loaded ${loaded.id}`
          },
        },
      ] as const),
    })

    const match = await router.navigate("/loaded/42?tab=details")
    const element = outlet.firstElementChild as AppLoaded & { iktiaRoute?: IktiaRouteMatch }

    expect(match?.data).toEqual({ id: "42", tab: "details" })
    expect(element.routeData).toEqual({ id: "42", tab: "details" })
    expect(element.iktiaRoute?.data).toEqual({ id: "42", tab: "details" })
    expect(document.title).toBe("Loaded 42")
  })

  it("runs route actions and revalidates loader data", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppAction extends HTMLElement {}
    if (!customElements.get("app-action")) customElements.define("app-action", AppAction)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    let loaderRuns = 0
    const actionCommits: IktiaRouteMatch[] = []
    const router = createRouter({
      outlet,
      routes: defineRoutes([
        {
          path: "/actions/:id",
          tag: "app-action",
          loader({ params }) {
            loaderRuns += 1
            return { id: params.id, loaderRuns }
          },
          action({ formData, params, request }) {
            expect(request.method).toBe("POST")
            return {
              id: params.id,
              note: String(formData.get("note") ?? ""),
            }
          },
        },
      ] as const),
    })
    router.addEventListener("iktia:actioncommit", (event) => {
      actionCommits.push((event as CustomEvent<{ match: IktiaRouteMatch }>).detail.match)
    })

    const match = await router.submit("/actions/42", {
      formData: { note: "ship faster" },
      method: "post",
    })

    const element = outlet.firstElementChild as HTMLElement & { iktiaRoute?: IktiaRouteMatch }
    expect(match?.actionData).toEqual({ id: "42", note: "ship faster" })
    expect(match?.data).toEqual({ id: "42", loaderRuns: 1 })
    expect(element.iktiaRoute?.actionData).toEqual({ id: "42", note: "ship faster" })
    expect(actionCommits).toHaveLength(1)
    expect(actionCommits[0]?.actionData).toEqual({ id: "42", note: "ship faster" })
  })

  it("follows action redirects through the router", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppHome extends HTMLElement {}
    class AppSave extends HTMLElement {}
    if (!customElements.get("app-redirect-home")) customElements.define("app-redirect-home", AppHome)
    if (!customElements.get("app-save")) customElements.define("app-save", AppSave)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    const router = createRouter({
      outlet,
      routes: defineRoutes([
        { path: "/", tag: "app-redirect-home" },
        {
          path: "/save",
          tag: "app-save",
          action() {
            return redirect("/", { replace: true })
          },
        },
      ] as const),
    })

    const match = await router.submit("/save", { formData: {}, method: "post" })

    expect(match?.url.pathname).toBe("/")
    expect(outlet.firstElementChild?.tagName.toLowerCase()).toBe("app-redirect-home")
  })

  it("intercepts explicit data action forms", async () => {
    document.body.innerHTML = `
      <section data-root>
        <form data-iktia-action action="/forms/42" method="post">
          <input name="note" value="from form">
          <button>Save</button>
        </form>
        <main data-outlet></main>
      </section>
    `

    class AppForm extends HTMLElement {}
    if (!customElements.get("app-form")) customElements.define("app-form", AppForm)

    const outlet = document.querySelector("[data-outlet]")
    const linkRoot = document.querySelector("[data-root]")
    const form = document.querySelector("form")
    if (!outlet || !linkRoot || !form) throw new Error("Missing test form setup.")

    const router = createRouter({
      linkRoot,
      outlet,
      routes: defineRoutes([
        {
          path: "/forms/:id",
          tag: "app-form",
          action({ formData, params }) {
            return {
              id: params.id,
              note: String(formData.get("note") ?? ""),
            }
          },
        },
      ] as const),
    })

    const actionCommit = new Promise<IktiaRouteMatch>((resolve) => {
      router.addEventListener("iktia:actioncommit", (event) => {
        resolve((event as CustomEvent<{ match: IktiaRouteMatch }>).detail.match)
      }, { once: true })
    })
    router.start()
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }))

    await expect(actionCommit).resolves.toMatchObject({
      actionData: { id: "42", note: "from form" },
    })
    expect(outlet.firstElementChild?.tagName.toLowerCase()).toBe("app-form")
  })

  it("lets same-page hash links use native fragment navigation", () => {
    document.body.innerHTML = `
      <section data-root>
        <a href="#details" data-fragment>Details</a>
        <main data-outlet></main>
      </section>
    `

    class AppHome extends HTMLElement {}
    if (!customElements.get("app-hash-home")) customElements.define("app-hash-home", AppHome)

    const outlet = document.querySelector("[data-outlet]")
    const linkRoot = document.querySelector("[data-root]")
    const anchor = document.querySelector("[data-fragment]")
    if (!outlet || !linkRoot || !anchor) throw new Error("Missing test hash-link setup.")

    const router = createRouter({
      linkRoot,
      outlet,
      routes: defineRoutes([{ path: "/", tag: "app-hash-home" }] as const),
    })

    router.start()
    const event = new MouseEvent("click", { bubbles: true, cancelable: true })
    anchor.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    router.stop()
  })

  it("replaces an action URL query string for GET submissions", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppSearch extends HTMLElement {}
    if (!customElements.get("app-search")) customElements.define("app-search", AppSearch)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    const router = createRouter({
      outlet,
      routes: defineRoutes([{ path: "/search", tag: "app-search" }] as const),
    })

    const match = await router.submit("/search?q=old&page=1", {
      formData: { q: "new" },
      method: "get",
    })

    expect(match?.url.search).toBe("?q=new")
  })

  it("commits the error route for cyclic guard redirects", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppPage extends HTMLElement {}
    class AppError extends HTMLElement {}
    if (!customElements.get("app-loop-page")) customElements.define("app-loop-page", AppPage)
    if (!customElements.get("app-loop-error")) customElements.define("app-loop-error", AppError)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    const router = createRouter({
      outlet,
      routes: defineRoutes([
        { path: "/a", tag: "app-loop-page", canEnter: () => "/b" },
        { path: "/b", tag: "app-loop-page", canEnter: () => "/a" },
      ] as const),
      error: {
        tag: "app-loop-error",
      },
    })

    const match = await router.navigate("/a")

    expect(match?.route.tag).toBe("app-loop-error")
    expect(outlet.firstElementChild?.tagName.toLowerCase()).toBe("app-loop-error")
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
