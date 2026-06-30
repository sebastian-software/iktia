import { describe, expect, it, vi } from "vitest"

import { createRouter, defineRoutes, redirect, type NaosRouteMatch } from "./index.js"

type TestPlatform = {
  readonly history: History
  readonly location: Location
  readonly routerPlatform: unknown
  readonly scrollToCalls: Array<{ x: number; y: number }>
  dispatchPopState(): void
  setScroll(position: { x: number; y: number }): void
}

function setupRouter() {
  document.body.innerHTML = `
    <nav>
      <a href="/" data-home data-naos-active-match="exact">Home</a>
      <a href="/products/42?tab=details" data-product data-naos-active-match="prefix">Product</a>
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

function setupPlatform(initialUrl = "https://naos.test/"): TestPlatform {
  let currentScroll = { x: 0, y: 0 }
  const listeners = new Set<EventListener>()
  const scrollToCalls: Array<{ x: number; y: number }> = []
  const entries: Array<{ href: string; state: unknown }> = [{ href: initialUrl, state: null }]
  let index = 0
  const currentHref = () => entries[index]?.href ?? initialUrl

  const dispatchPopState = () => {
    const event = new PopStateEvent("popstate", { state: entries[index]?.state })
    for (const listener of listeners) listener(event)
  }

  const history = {
    scrollRestoration: "auto",
    get state() {
      return entries[index]?.state ?? null
    },
    back() {
      if (index === 0) return
      index -= 1
      dispatchPopState()
    },
    forward() {
      if (index >= entries.length - 1) return
      index += 1
      dispatchPopState()
    },
    pushState(data: unknown, _unused: string, url?: string | URL | null) {
      const href = url ? new URL(String(url), currentHref()).href : currentHref()
      entries.splice(index + 1)
      entries.push({ href, state: data })
      index = entries.length - 1
    },
    replaceState(data: unknown, _unused: string, url?: string | URL | null) {
      const href = url ? new URL(String(url), currentHref()).href : currentHref()
      entries[index] = { href, state: data }
    },
  } as History

  const location = {
    get href() {
      return currentHref()
    },
  } as Location

  const platform = {
    document,
    history,
    location,
    addEventListener: (_name: "popstate", listener: EventListener) => {
      listeners.add(listener)
    },
    getScrollPosition: () => currentScroll,
    removeEventListener: (_name: "popstate", listener: EventListener) => {
      listeners.delete(listener)
    },
    scrollTo: (position: { x: number; y: number }) => {
      currentScroll = position
      scrollToCalls.push(position)
    },
  }

  return {
    dispatchPopState,
    history,
    location,
    routerPlatform: platform,
    scrollToCalls,
    setScroll(position) {
      currentScroll = position
    },
  }
}

async function waitForRouterWork(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe("NaosRouter", () => {
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
    const commits: NaosRouteMatch[] = []
    router.addEventListener("naos:navigationcommit", (event) => {
      commits.push((event as CustomEvent<{ match: NaosRouteMatch }>).detail.match)
    })

    await router.navigate("/products/42?tab=details")

    const element = outlet.firstElementChild as HTMLElement & {
      naosRoute?: NaosRouteMatch
      productId?: string
    }
    expect(element.tagName.toLowerCase()).toBe("app-product")
    expect(element.productId).toBe("42")
    expect(element.getAttribute("data-product-id")).toBe("42")
    expect(element.naosRoute?.params).toEqual({ id: "42" })
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
    const element = outlet.firstElementChild as AppLoaded & { naosRoute?: NaosRouteMatch }

    expect(match?.data).toEqual({ id: "42", tab: "details" })
    expect(element.routeData).toEqual({ id: "42", tab: "details" })
    expect(element.naosRoute?.data).toEqual({ id: "42", tab: "details" })
    expect(document.title).toBe("Loaded 42")
  })

  it("runs route actions and revalidates loader data", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppAction extends HTMLElement {}
    if (!customElements.get("app-action")) customElements.define("app-action", AppAction)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    let loaderRuns = 0
    const actionCommits: NaosRouteMatch[] = []
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
    router.addEventListener("naos:actioncommit", (event) => {
      actionCommits.push((event as CustomEvent<{ match: NaosRouteMatch }>).detail.match)
    })

    const match = await router.submit("/actions/42", {
      formData: { note: "ship faster" },
      method: "post",
    })

    const element = outlet.firstElementChild as HTMLElement & { naosRoute?: NaosRouteMatch }
    expect(match?.actionData).toEqual({ id: "42", note: "ship faster" })
    expect(match?.data).toEqual({ id: "42", loaderRuns: 1 })
    expect(element.naosRoute?.actionData).toEqual({ id: "42", note: "ship faster" })
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
        <form data-naos-action action="/forms/42" method="post">
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

    const actionCommit = new Promise<NaosRouteMatch>((resolve) => {
      router.addEventListener("naos:actioncommit", (event) => {
        resolve((event as CustomEvent<{ match: NaosRouteMatch }>).detail.match)
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

  it("restores scroll positions when traversing history entries", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppScrollA extends HTMLElement {}
    class AppScrollB extends HTMLElement {}
    if (!customElements.get("app-scroll-a")) customElements.define("app-scroll-a", AppScrollA)
    if (!customElements.get("app-scroll-b")) customElements.define("app-scroll-b", AppScrollB)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    const platform = setupPlatform("https://naos.test/a")
    const router = createRouter({
      outlet,
      routes: defineRoutes([
        { path: "/a", tag: "app-scroll-a" },
        { path: "/b", tag: "app-scroll-b" },
      ] as const),
      ...({ platform: platform.routerPlatform } as { platform: unknown }),
    })

    router.start()
    await waitForRouterWork()
    platform.setScroll({ x: 0, y: 128 })

    await router.navigate("/b")
    expect(platform.scrollToCalls.at(-1)).toEqual({ x: 0, y: 0 })

    platform.setScroll({ x: 0, y: 512 })
    platform.history.back()
    await waitForRouterWork()

    expect(outlet.firstElementChild?.tagName.toLowerCase()).toBe("app-scroll-a")
    expect(platform.scrollToCalls.at(-1)).toEqual({ x: 0, y: 128 })
    expect(platform.history.scrollRestoration).toBe("manual")

    router.stop()
    expect(platform.history.scrollRestoration).toBe("auto")
  })

  it("uses a configured scroll restoration key strategy", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppKeyedA extends HTMLElement {}
    class AppKeyedB extends HTMLElement {}
    if (!customElements.get("app-keyed-a")) customElements.define("app-keyed-a", AppKeyedA)
    if (!customElements.get("app-keyed-b")) customElements.define("app-keyed-b", AppKeyedB)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    const getKey = vi.fn(({ url }: { url: URL }) => `${url.pathname}${url.search}`)
    const platform = setupPlatform("https://naos.test/a?tab=one")
    const router = createRouter({
      outlet,
      routes: defineRoutes([
        { path: "/a", tag: "app-keyed-a" },
        { path: "/b", tag: "app-keyed-b" },
      ] as const),
      scrollRestoration: { getKey },
      ...({ platform: platform.routerPlatform } as { platform: unknown }),
    })

    router.start()
    await waitForRouterWork()
    platform.setScroll({ x: 4, y: 240 })

    await router.navigate("/b?tab=two")
    platform.history.back()
    await waitForRouterWork()

    expect(getKey).toHaveBeenCalled()
    expect(platform.scrollToCalls.at(-1)).toEqual({ x: 4, y: 240 })

    router.stop()
  })

  it("scrolls new navigations to hash targets and can skip scroll restoration per navigation", async () => {
    document.body.innerHTML = `<main data-outlet></main>`
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    class AppHashTarget extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `<article><h1 id="details">Details</h1></article>`
      }
    }
    class AppManualScroll extends HTMLElement {}
    if (!customElements.get("app-hash-target")) customElements.define("app-hash-target", AppHashTarget)
    if (!customElements.get("app-manual-scroll")) customElements.define("app-manual-scroll", AppManualScroll)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    const platform = setupPlatform()
    const router = createRouter({
      outlet,
      routes: defineRoutes([
        { path: "/details", tag: "app-hash-target" },
        { path: "/manual", tag: "app-manual-scroll" },
      ] as const),
      ...({ platform: platform.routerPlatform } as { platform: unknown }),
    })

    await router.navigate("/details#details")
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(platform.scrollToCalls).toHaveLength(0)

    await router.navigate("/manual", { scroll: false })
    expect(platform.scrollToCalls).toHaveLength(0)
  })

  it("moves focus to route targets and falls back to headings", async () => {
    document.body.innerHTML = `<main data-outlet></main>`

    class AppFocused extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `<article><button data-focus-target>Save</button></article>`
      }
    }
    class AppFallbackFocus extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `<article><h1>Fallback heading</h1></article>`
      }
    }
    if (!customElements.get("app-focused")) customElements.define("app-focused", AppFocused)
    if (!customElements.get("app-fallback-focus")) customElements.define("app-fallback-focus", AppFallbackFocus)

    const outlet = document.querySelector("[data-outlet]")
    if (!outlet) throw new Error("Missing test outlet.")

    const platform = setupPlatform()
    const router = createRouter({
      outlet,
      routes: defineRoutes([
        { path: "/focused", tag: "app-focused", focusTarget: "[data-focus-target]" },
        { path: "/fallback", tag: "app-fallback-focus", focusTarget: "[data-missing]" },
      ] as const),
      ...({ platform: platform.routerPlatform } as { platform: unknown }),
    })

    await router.navigate("/focused")
    expect(document.activeElement?.getAttribute("data-focus-target")).toBe("")

    await router.navigate("/fallback")
    expect(document.activeElement?.tagName.toLowerCase()).toBe("h1")
  })

  it("can disable scroll and focus restoration for manually controlled apps", async () => {
    document.body.innerHTML = `<button data-before>Before</button><main data-outlet></main>`

    class AppDisabledRestoration extends HTMLElement {
      connectedCallback() {
        this.innerHTML = `<article><h1>Manual</h1></article>`
      }
    }
    if (!customElements.get("app-disabled-restoration")) {
      customElements.define("app-disabled-restoration", AppDisabledRestoration)
    }

    const outlet = document.querySelector("[data-outlet]")
    const before = document.querySelector<HTMLElement>("[data-before]")
    if (!outlet || !before) throw new Error("Missing test outlet.")
    before.focus()

    const platform = setupPlatform()
    const router = createRouter({
      focusRestoration: false,
      outlet,
      routes: defineRoutes([{ path: "/manual", tag: "app-disabled-restoration" }] as const),
      scrollRestoration: false,
      ...({ platform: platform.routerPlatform } as { platform: unknown }),
    })

    await router.navigate("/manual")

    expect(platform.scrollToCalls).toHaveLength(0)
    expect(document.activeElement).toBe(before)
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
    router.addEventListener("naos:navigationabort", (event) => {
      const navigation = (event as CustomEvent<{ navigation: NaosRouteMatch["navigation"] }>).detail.navigation
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
