export type IktiaNavigationType = "load" | "push" | "replace" | "traverse"

export type IktiaNavigation = {
  readonly id: number
  readonly url: URL
  readonly from: URL | null
  readonly type: IktiaNavigationType
  readonly signal: AbortSignal
}

export type IktiaRouteMatch<Route extends IktiaRoute = IktiaRoute> = {
  readonly route: Route
  readonly url: URL
  readonly params: Readonly<Record<string, string>>
  readonly search: URLSearchParams
  readonly navigation: IktiaNavigation
}

export type IktiaRouteBase = {
  readonly path: string
  readonly load?: (navigation: IktiaNavigation) => Promise<unknown> | unknown
  readonly props?: (match: IktiaRouteMatch) => Record<string, unknown>
  readonly attrs?: (match: IktiaRouteMatch) => Record<string, string | null>
  readonly canEnter?: (
    match: IktiaRouteMatch
  ) => boolean | string | URL | Promise<boolean | string | URL>
  readonly title?: string | ((match: IktiaRouteMatch) => string)
}

export type IktiaTagRoute = IktiaRouteBase & {
  readonly tag: string
  readonly createElement?: never
}

export type IktiaCreateElementRoute = IktiaRouteBase & {
  readonly tag?: never
  readonly createElement: (match: IktiaRouteMatch) => HTMLElement
}

export type IktiaRoute = IktiaTagRoute | IktiaCreateElementRoute

export type IktiaFallbackRoute =
  | Omit<IktiaTagRoute, "path"> & { readonly path?: string }
  | Omit<IktiaCreateElementRoute, "path"> & { readonly path?: string }

export type IktiaHrefOptions = {
  readonly hash?: string
  readonly search?: URLSearchParams | Record<string, string | number | boolean | null | undefined> | string
}

export type IktiaNavigateOptions = {
  readonly replace?: boolean
  readonly viewTransition?: boolean
}

export type IktiaRouterOptions<Routes extends readonly IktiaRoute[]> = {
  readonly basePath?: string
  readonly linkRoot?: ParentNode & EventTarget
  readonly notFound?: IktiaFallbackRoute
  readonly error?: IktiaFallbackRoute
  readonly outlet: Element
  readonly routes: Routes
}

export type IktiaRouterEventMap<Routes extends readonly IktiaRoute[]> = {
  "iktia:navigationabort": {
    readonly navigation: IktiaNavigation
  }
  "iktia:navigationcommit": {
    readonly match: IktiaRouteMatch<Routes[number]>
    readonly navigation: IktiaNavigation
  }
  "iktia:navigationerror": {
    readonly error: unknown
    readonly navigation: IktiaNavigation
  }
  "iktia:navigationstart": {
    readonly navigation: IktiaNavigation
  }
  "iktia:routechange": {
    readonly match: IktiaRouteMatch<Routes[number]>
    readonly navigation: IktiaNavigation
  }
}

export type IktiaRouterEventName = keyof IktiaRouterEventMap<readonly IktiaRoute[]>

type InternalRouterOptions<Routes extends readonly IktiaRoute[]> = IktiaRouterOptions<Routes> & {
  readonly platform?: RouterPlatform
}

type RoutePath<Routes extends readonly IktiaRoute[]> = Routes[number]["path"]

type SplitPathParam<Param extends string> = Param extends `${infer Name}?`
  ? Name
  : Param extends `${infer Name}*`
    ? Name
    : Param

type PathParamNames<Path extends string> = string extends Path
  ? string
  : Path extends `${string}:${infer Param}/${infer Rest}`
    ? SplitPathParam<Param> | PathParamNames<`/${Rest}`>
    : Path extends `${string}:${infer Param}`
      ? SplitPathParam<Param>
      : never

export type IktiaPathParams<Path extends string> = [PathParamNames<Path>] extends [never]
  ? Record<string, never>
  : Record<PathParamNames<Path>, string | number | boolean>

type RouteMatcher = {
  readonly route: IktiaRoute
  exec(pathname: string): Readonly<Record<string, string>> | null
}

type RouteElement = HTMLElement & {
  iktiaRoute?: IktiaRouteMatch
}

type RouterPlatform = {
  readonly document: Document
  readonly history: History
  readonly location: Location
  addEventListener(name: "popstate", listener: EventListener): void
  removeEventListener(name: "popstate", listener: EventListener): void
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { readonly finished?: Promise<unknown> }
}

const ROUTER_EVENT_NAMES = new Set<string>([
  "iktia:navigationabort",
  "iktia:navigationcommit",
  "iktia:navigationerror",
  "iktia:navigationstart",
  "iktia:routechange",
])

export function defineRoutes<const Routes extends readonly IktiaRoute[]>(
  routes: Routes
): Routes {
  return routes
}

export function createRouter<const Routes extends readonly IktiaRoute[]>(
  options: IktiaRouterOptions<Routes>
): IktiaRouter<Routes> {
  return new IktiaRouter(options)
}

export class IktiaRouter<Routes extends readonly IktiaRoute[] = readonly IktiaRoute[]> extends EventTarget {
  readonly basePath: string
  readonly outlet: Element
  readonly routes: Routes

  #activeController: AbortController | null = null
  #activeNavigation: IktiaNavigation | null = null
  #currentMatch: IktiaRouteMatch<Routes[number]> | null = null
  #linkRoot: (ParentNode & EventTarget) | null
  #loadPromises = new WeakMap<IktiaRoute | IktiaFallbackRoute, Promise<unknown>>()
  #matchers: RouteMatcher[]
  #navigationId = 0
  #notFound: IktiaFallbackRoute | null
  #error: IktiaFallbackRoute | null
  #platform: RouterPlatform
  #started = false

  constructor(options: InternalRouterOptions<Routes>) {
    super()
    this.basePath = normalizeBasePath(options.basePath ?? "/")
    this.outlet = options.outlet
    this.routes = options.routes
    this.#linkRoot = options.linkRoot ?? defaultLinkRoot()
    this.#notFound = options.notFound ?? null
    this.#error = options.error ?? null
    this.#platform = options.platform ?? defaultPlatform()
    this.#matchers = options.routes.map((route) => ({
      route,
      exec: compileRoutePath(route.path),
    }))
  }

  get currentMatch(): IktiaRouteMatch<Routes[number]> | null {
    return this.#currentMatch
  }

  start(): void {
    if (this.#started) return
    this.#started = true
    this.#linkRoot?.addEventListener("click", this.#onClick)
    this.#platform.addEventListener("popstate", this.#onPopState)
    void this.#navigateToUrl(this.#currentUrl(), {
      history: "none",
      type: "load",
      viewTransition: false,
    })
  }

  stop(): void {
    if (!this.#started) return
    this.#started = false
    this.#linkRoot?.removeEventListener("click", this.#onClick)
    this.#platform.removeEventListener("popstate", this.#onPopState)
    this.#activeController?.abort()
    this.#activeController = null
    this.#activeNavigation = null
  }

  href<Path extends RoutePath<Routes>>(
    path: Path,
    params?: IktiaPathParams<Path>,
    options?: IktiaHrefOptions
  ): string {
    const resolvedPath = interpolatePath(String(path), params ?? {})
    const pathname = joinBasePath(this.basePath, resolvedPath)
    return appendUrlParts(pathname, options)
  }

  match(to: string | URL): IktiaRouteMatch<Routes[number]> | null {
    const url = this.#resolveUrl(to)
    const matched = this.#findRoute(url)
    if (!matched) return null
    return {
      route: matched.route as Routes[number],
      url,
      params: matched.params,
      search: url.searchParams,
      navigation: this.#activeNavigation ?? this.#createNavigation(url, "load"),
    }
  }

  navigate(to: string | URL, options: IktiaNavigateOptions = {}): Promise<IktiaRouteMatch<Routes[number]> | null> {
    return this.#navigateToUrl(this.#resolveUrl(to), {
      history: options.replace ? "replace" : "push",
      type: options.replace ? "replace" : "push",
      viewTransition: options.viewTransition ?? false,
    })
  }

  replace(to: string | URL, options: Omit<IktiaNavigateOptions, "replace"> = {}): Promise<IktiaRouteMatch<Routes[number]> | null> {
    return this.navigate(to, { ...options, replace: true })
  }

  back(): void {
    this.#platform.history.back()
  }

  forward(): void {
    this.#platform.history.forward()
  }

  reload(options: Omit<IktiaNavigateOptions, "replace"> = {}): Promise<IktiaRouteMatch<Routes[number]> | null> {
    return this.replace(this.#currentUrl(), options)
  }

  async prefetch(to: string | URL): Promise<void> {
    const url = this.#resolveUrl(to)
    const matched = this.#findRoute(url)
    if (!matched) return
    const navigation = this.#createNavigation(url, "load")
    await this.#loadRoute(matched.route, navigation)
  }

  #onClick = (event: Event): void => {
    if (event.defaultPrevented || !isPlainLeftClick(event)) return
    const anchor = findAnchor(event.target)
    if (!anchor || !isRoutableAnchor(anchor)) return

    const url = new URL(anchor.href, this.#currentUrl())
    if (url.origin !== this.#currentUrl().origin || this.#toInternalPath(url) === null) {
      return
    }

    event.preventDefault()
    void this.navigate(url, {
      viewTransition: anchor.hasAttribute("data-iktia-view-transition"),
    })
  }

  #onPopState = (): void => {
    void this.#navigateToUrl(this.#currentUrl(), {
      history: "none",
      type: "traverse",
      viewTransition: false,
    })
  }

  async #navigateToUrl(
    url: URL,
    options: {
      readonly history: "none" | "push" | "replace"
      readonly type: IktiaNavigationType
      readonly viewTransition: boolean
    }
  ): Promise<IktiaRouteMatch<Routes[number]> | null> {
    if (this.#activeController && this.#activeNavigation) {
      const previousNavigation = this.#activeNavigation
      this.#activeController.abort()
      this.#dispatchRouterEvent("iktia:navigationabort", {
        navigation: previousNavigation,
      })
    }

    const controller = new AbortController()
    const navigation: IktiaNavigation = {
      id: ++this.#navigationId,
      url,
      from: this.#currentMatch?.url ?? null,
      type: options.type,
      signal: controller.signal,
    }

    this.#activeController = controller
    this.#activeNavigation = navigation
    this.#dispatchRouterEvent("iktia:navigationstart", { navigation })

    try {
      const matched = this.#findRoute(url)
      const route = matched?.route ?? this.#notFound
      if (!route) return null

      const routeForMatch = normalizeFallbackRoute(route, matched?.route)
      const match = {
        route: routeForMatch as Routes[number],
        url,
        params: matched?.params ?? {},
        search: url.searchParams,
        navigation,
      } satisfies IktiaRouteMatch<Routes[number]>

      const guard = "canEnter" in route && route.canEnter ? await route.canEnter(match) : true
      if (!this.#isCurrent(navigation)) return null
      if (guard === false) return null
      if (typeof guard === "string" || guard instanceof URL) {
        return this.#navigateToUrl(this.#resolveUrl(guard), {
          history: "replace",
          type: "replace",
          viewTransition: options.viewTransition,
        })
      }

      await this.#loadRoute(route, navigation)
      if (!this.#isCurrent(navigation)) return null

      if (options.history === "push") {
        this.#platform.history.pushState(null, "", url)
      } else if (options.history === "replace") {
        this.#platform.history.replaceState(null, "", url)
      }

      await this.#commit(match, route, options.viewTransition)
      return match
    } catch (error) {
      if (!this.#isCurrent(navigation)) return null
      this.#dispatchRouterEvent("iktia:navigationerror", { error, navigation })
      if (this.#error) {
        const errorRoute = normalizeFallbackRoute(this.#error)
        const match = {
          route: errorRoute as Routes[number],
          url,
          params: {},
          search: url.searchParams,
          navigation,
        } satisfies IktiaRouteMatch<Routes[number]>
        await this.#commit(match, this.#error, false)
        return match
      }
      throw error
    } finally {
      if (this.#activeNavigation?.id === navigation.id) {
        this.#activeController = null
        this.#activeNavigation = null
      }
    }
  }

  async #commit(
    match: IktiaRouteMatch<Routes[number]>,
    route: IktiaRoute | IktiaFallbackRoute,
    viewTransition: boolean
  ): Promise<void> {
    const commit = () => {
      this.#mount(match, route)
      this.#currentMatch = match
      this.#updateTitle(match, route)
      this.#updateActiveLinks(match.url)
      this.#dispatchRouterEvent("iktia:navigationcommit", {
        match,
        navigation: match.navigation,
      })
      this.#dispatchRouterEvent("iktia:routechange", {
        match,
        navigation: match.navigation,
      })
    }

    const documentWithTransitions = this.#platform.document as ViewTransitionDocument
    if (viewTransition && typeof documentWithTransitions.startViewTransition === "function") {
      const transition = documentWithTransitions.startViewTransition(commit)
      await transition.finished
      return
    }

    commit()
  }

  #mount(match: IktiaRouteMatch<Routes[number]>, route: IktiaRoute | IktiaFallbackRoute): void {
    const element = createRouteElement(this.#platform.document, route, match)
    const props = route.props?.(match) ?? {}
    for (const [name, value] of Object.entries(props)) {
      ;(element as unknown as Record<string, unknown>)[name] = value
    }

    element.iktiaRoute = match

    const attrs = route.attrs?.(match) ?? {}
    for (const [name, value] of Object.entries(attrs)) {
      if (value === null) {
        element.removeAttribute(name)
      } else {
        element.setAttribute(name, value)
      }
    }

    this.outlet.replaceChildren(element)
  }

  #findRoute(url: URL): { readonly params: Readonly<Record<string, string>>; readonly route: IktiaRoute } | null {
    const pathname = this.#toInternalPath(url)
    if (pathname === null) return null
    for (const matcher of this.#matchers) {
      const params = matcher.exec(pathname)
      if (params) return { params, route: matcher.route }
    }
    return null
  }

  #loadRoute(route: IktiaRoute | IktiaFallbackRoute, navigation: IktiaNavigation): Promise<unknown> {
    if (!route.load) return Promise.resolve()
    const cached = this.#loadPromises.get(route)
    if (cached) return cached
    const promise = Promise.resolve(route.load(navigation)).catch((error: unknown) => {
      this.#loadPromises.delete(route)
      throw error
    })
    this.#loadPromises.set(route, promise)
    return promise
  }

  #dispatchRouterEvent<Name extends IktiaRouterEventName>(
    name: Name,
    detail: IktiaRouterEventMap<Routes>[Name]
  ): void {
    if (!ROUTER_EVENT_NAMES.has(name)) return
    const event = new CustomEvent(name, {
      bubbles: false,
      cancelable: false,
      composed: false,
      detail,
    })
    this.dispatchEvent(event)

    const outletEvent = new CustomEvent(name, {
      bubbles: true,
      cancelable: false,
      composed: true,
      detail,
    })
    this.outlet.dispatchEvent(outletEvent)
  }

  #updateActiveLinks(url: URL): void {
    if (!this.#linkRoot || typeof this.#linkRoot.querySelectorAll !== "function") return
    const currentPath = this.#toInternalPath(url)
    if (currentPath === null) return

    for (const anchor of this.#linkRoot.querySelectorAll("a[href]")) {
      const href = anchor.getAttribute("href")
      if (!href) continue
      const linkUrl = new URL(href, url)
      if (linkUrl.origin !== url.origin) continue
      const linkPath = this.#toInternalPath(linkUrl)
      if (linkPath === null) continue

      const matchMode = anchor.getAttribute("data-iktia-active-match") === "prefix" ? "prefix" : "exact"
      const active =
        matchMode === "prefix"
          ? currentPath === linkPath || currentPath.startsWith(`${removeTrailingSlash(linkPath)}/`)
          : currentPath === linkPath

      if (active) {
        anchor.setAttribute("data-active", "")
        if (matchMode === "exact") anchor.setAttribute("aria-current", "page")
      } else {
        anchor.removeAttribute("data-active")
        if (anchor.getAttribute("aria-current") === "page") {
          anchor.removeAttribute("aria-current")
        }
      }
    }
  }

  #updateTitle(match: IktiaRouteMatch<Routes[number]>, route: IktiaRoute | IktiaFallbackRoute): void {
    if (!route.title) return
    this.#platform.document.title = typeof route.title === "function" ? route.title(match) : route.title
  }

  #resolveUrl(to: string | URL): URL {
    if (to instanceof URL) return to
    if (to.startsWith("/")) {
      return new URL(joinBasePath(this.basePath, to), this.#currentUrl())
    }
    return new URL(to, this.#currentUrl())
  }

  #toInternalPath(url: URL): string | null {
    const base = this.basePath
    const pathname = removeTrailingSlash(url.pathname) || "/"
    if (base === "/") return pathname
    if (pathname === base) return "/"
    if (pathname.startsWith(`${base}/`)) {
      return pathname.slice(base.length) || "/"
    }
    return null
  }

  #currentUrl(): URL {
    return new URL(this.#platform.location.href)
  }

  #createNavigation(url: URL, type: IktiaNavigationType): IktiaNavigation {
    return {
      id: this.#navigationId,
      url,
      from: this.#currentMatch?.url ?? null,
      type,
      signal: this.#activeController?.signal ?? new AbortController().signal,
    }
  }

  #isCurrent(navigation: IktiaNavigation): boolean {
    return this.#activeNavigation?.id === navigation.id && !navigation.signal.aborted
  }
}

function defaultPlatform(): RouterPlatform {
  return {
    document: window.document,
    history: window.history,
    location: window.location,
    addEventListener: (name, listener) => window.addEventListener(name, listener),
    removeEventListener: (name, listener) => window.removeEventListener(name, listener),
  }
}

function defaultLinkRoot(): (ParentNode & EventTarget) | null {
  return typeof document === "undefined" ? null : document
}

function createRouteElement(
  document: Document,
  route: IktiaRoute | IktiaFallbackRoute,
  match: IktiaRouteMatch
): RouteElement {
  if ("createElement" in route && route.createElement) {
    return route.createElement(match) as RouteElement
  }
  if ("tag" in route && route.tag) {
    return document.createElement(route.tag) as RouteElement
  }
  throw new Error("Route must define either tag or createElement.")
}

function normalizeFallbackRoute(
  route: IktiaRoute | IktiaFallbackRoute,
  matchedRoute?: IktiaRoute
): IktiaRoute {
  if (matchedRoute) return matchedRoute
  return { ...route, path: route.path ?? "*" } as IktiaRoute
}

function isPlainLeftClick(event: Event): boolean {
  if (!(event instanceof MouseEvent)) return true
  return event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey
}

function findAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  let current = target
  while (current && current instanceof Element) {
    if (current.tagName.toLowerCase() === "a") return current as HTMLAnchorElement
    current = current.parentElement
  }
  return null
}

function isRoutableAnchor(anchor: HTMLAnchorElement): boolean {
  return !anchor.target && !anchor.hasAttribute("download") && !anchor.getAttribute("rel")?.split(/\s+/).includes("external")
}

function compileRoutePath(path: string): (pathname: string) => Readonly<Record<string, string>> | null {
  const normalizedPath = normalizeRoutePath(path)
  if (typeof URLPattern === "function" && normalizedPath !== "*") {
    try {
      const pattern = new URLPattern({ pathname: normalizedPath }, "https://iktia.local")
      return (pathname) => {
        const result = pattern.exec(new URL(pathname, "https://iktia.local"))
        return result?.pathname.groups ? normalizeGroups(result.pathname.groups) : null
      }
    } catch {
      // Some DOM test environments expose URLPattern but not the full browser syntax.
    }
  }

  const fallback = compileFallbackRoutePath(normalizedPath)
  return (pathname) => {
    const match = fallback.regex.exec(pathname)
    if (!match?.groups) return match ? {} : null
    return normalizeGroups(match.groups)
  }
}

function compileFallbackRoutePath(path: string): { readonly regex: RegExp } {
  if (path === "*") return { regex: /^.*$/u }
  const segments = normalizeRoutePath(path).split("/").filter(Boolean)
  if (segments.length === 0) return { regex: /^\/$/u }

  const pattern = segments
    .map((segment) => {
      if (segment === "*") return "/.*"

      const param = /^:([A-Za-z0-9_]+)([?*]?)$/u.exec(segment)
      if (param) {
        const [, name, modifier] = param
        if (modifier === "?") return `(?:/(?<${name}>[^/]+))?`
        if (modifier === "*") return `(?:/(?<${name}>.*))?`
        return `/(?<${name}>[^/]+)`
      }

      return `/${escapeRegExp(segment)}`
    })
    .join("")
  return { regex: new RegExp(`^${pattern}$`, "u") }
}

function normalizeGroups(groups: Record<string, string | undefined>): Readonly<Record<string, string>> {
  const normalized: Record<string, string> = {}
  for (const [name, value] of Object.entries(groups)) {
    if (value !== undefined) normalized[name] = decodeURIComponent(value)
  }
  return normalized
}

function normalizeRoutePath(path: string): string {
  if (path === "*") return path
  return path.startsWith("/") ? removeTrailingSlash(path) : `/${removeTrailingSlash(path)}`
}

function normalizeBasePath(path: string): string {
  const withLeadingSlash = path.startsWith("/") ? path : `/${path}`
  return removeTrailingSlash(withLeadingSlash) || "/"
}

function removeTrailingSlash(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/u, "") : path
}

function joinBasePath(basePath: string, path: string): string {
  const normalizedPath = normalizeRoutePath(path)
  return basePath === "/" ? normalizedPath : `${basePath}${normalizedPath}`
}

function appendUrlParts(pathname: string, options: IktiaHrefOptions | undefined): string {
  if (!options) return pathname
  const search = formatSearch(options.search)
  const hash = options.hash ? (options.hash.startsWith("#") ? options.hash : `#${options.hash}`) : ""
  return `${pathname}${search}${hash}`
}

function formatSearch(search: IktiaHrefOptions["search"]): string {
  if (!search) return ""
  if (typeof search === "string") return search.startsWith("?") ? search : `?${search}`
  const params = search instanceof URLSearchParams ? search : objectToSearchParams(search)
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

function objectToSearchParams(record: Record<string, string | number | boolean | null | undefined>): URLSearchParams {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(record)) {
    if (value !== null && value !== undefined) params.set(name, String(value))
  }
  return params
}

function interpolatePath(path: string, params: Record<string, string | number | boolean>): string {
  return path.replace(/:([A-Za-z0-9_]+)/gu, (_segment, name: string) => {
    if (!(name in params)) {
      throw new Error(`Missing route param "${name}" for path "${path}".`)
    }
    return encodeURIComponent(String(params[name]))
  })
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
}
