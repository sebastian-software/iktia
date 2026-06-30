export type NaosNavigationType = "action" | "load" | "push" | "replace" | "traverse"

export type NaosNavigation = {
  readonly id: number
  readonly url: URL
  readonly from: URL | null
  readonly type: NaosNavigationType
  readonly signal: AbortSignal
}

export type NaosRouteMatch<Route extends NaosRoute = NaosRoute> = {
  readonly actionData?: unknown
  readonly data?: unknown
  readonly route: Route
  readonly url: URL
  readonly params: Readonly<Record<string, string>>
  readonly search: URLSearchParams
  readonly navigation: NaosNavigation
}

export type NaosLoaderArgs<Route extends NaosRoute = NaosRoute> = {
  readonly navigation: NaosNavigation
  readonly params: Readonly<Record<string, string>>
  readonly request: Request
  readonly route: Route
  readonly search: URLSearchParams
  readonly url: URL
}

export type NaosActionSubmission = {
  readonly form: HTMLFormElement | null
  readonly formData: FormData
  readonly method: string
  readonly submitter: HTMLElement | null
}

export type NaosActionArgs<Route extends NaosRoute = NaosRoute> = NaosLoaderArgs<Route> &
  NaosActionSubmission

export type NaosRedirect = {
  readonly replace?: boolean
  readonly to: string | URL
}

export type NaosFocusTarget =
  | string
  | ((match: NaosRouteMatch) => Element | null | undefined)

export type NaosFocusRestorationOptions = {
  readonly target?: NaosFocusTarget
}

export type NaosScrollKeyArgs = {
  readonly navigation: NaosNavigation | null
  readonly state: unknown
  readonly url: URL
}

export type NaosScrollPosition = {
  readonly x: number
  readonly y: number
}

export type NaosScrollRestorationOptions = {
  readonly getKey?: (args: NaosScrollKeyArgs) => string
}

export type NaosRouteBase = {
  readonly path: string
  readonly action?: (args: NaosActionArgs) => Promise<unknown> | unknown
  readonly loader?: (args: NaosLoaderArgs) => Promise<unknown> | unknown
  readonly load?: (navigation: NaosNavigation) => Promise<unknown> | unknown
  readonly focusTarget?: NaosFocusTarget
  readonly props?: (match: NaosRouteMatch) => Record<string, unknown>
  readonly attrs?: (match: NaosRouteMatch) => Record<string, string | null>
  readonly canEnter?: (
    match: NaosRouteMatch
  ) => boolean | string | URL | Promise<boolean | string | URL>
  readonly title?: string | ((match: NaosRouteMatch) => string)
}

export type NaosTagRoute = NaosRouteBase & {
  readonly tag: string
  readonly createElement?: never
}

export type NaosCreateElementRoute = NaosRouteBase & {
  readonly tag?: never
  readonly createElement: (match: NaosRouteMatch) => HTMLElement
}

export type NaosRoute = NaosTagRoute | NaosCreateElementRoute

export type NaosFallbackRoute =
  | Omit<NaosTagRoute, "path"> & { readonly path?: string }
  | Omit<NaosCreateElementRoute, "path"> & { readonly path?: string }

export type NaosHrefOptions = {
  readonly hash?: string
  readonly search?: URLSearchParams | Record<string, string | number | boolean | null | undefined> | string
}

export type NaosNavigateOptions = {
  readonly focus?: boolean
  readonly replace?: boolean
  readonly scroll?: boolean
  readonly viewTransition?: boolean
}

export type NaosSubmitOptions = {
  readonly focus?: boolean
  readonly form?: HTMLFormElement | null
  readonly formData?: FormData | URLSearchParams | Record<string, FormDataEntryValue | boolean | number | null | undefined>
  readonly method?: string
  readonly replace?: boolean
  readonly scroll?: boolean
  readonly submitter?: HTMLElement | null
  readonly viewTransition?: boolean
}

export type NaosRouterOptions<Routes extends readonly NaosRoute[]> = {
  readonly basePath?: string
  readonly focusRestoration?: boolean | NaosFocusRestorationOptions
  readonly linkRoot?: ParentNode & EventTarget
  readonly notFound?: NaosFallbackRoute
  readonly error?: NaosFallbackRoute
  readonly outlet: Element
  readonly routes: Routes
  readonly scrollRestoration?: boolean | NaosScrollRestorationOptions
}

export type NaosRouterEventMap<Routes extends readonly NaosRoute[]> = {
  "naos:actioncommit": {
    readonly data: unknown
    readonly match: NaosRouteMatch<Routes[number]>
    readonly navigation: NaosNavigation
    readonly submission: NaosActionSubmission
  }
  "naos:actionerror": {
    readonly error: unknown
    readonly navigation: NaosNavigation
    readonly submission: NaosActionSubmission
  }
  "naos:actionstart": {
    readonly navigation: NaosNavigation
    readonly submission: NaosActionSubmission
  }
  "naos:navigationabort": {
    readonly navigation: NaosNavigation
  }
  "naos:navigationcommit": {
    readonly match: NaosRouteMatch<Routes[number]>
    readonly navigation: NaosNavigation
  }
  "naos:navigationerror": {
    readonly error: unknown
    readonly navigation: NaosNavigation
  }
  "naos:navigationstart": {
    readonly navigation: NaosNavigation
  }
  "naos:routechange": {
    readonly match: NaosRouteMatch<Routes[number]>
    readonly navigation: NaosNavigation
  }
}

export type NaosRouterEventName = keyof NaosRouterEventMap<readonly NaosRoute[]>

type InternalRouterOptions<Routes extends readonly NaosRoute[]> = NaosRouterOptions<Routes> & {
  readonly platform?: RouterPlatform
}

type RoutePath<Routes extends readonly NaosRoute[]> = Routes[number]["path"]

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

export type NaosPathParams<Path extends string> = [PathParamNames<Path>] extends [never]
  ? Record<string, never>
  : Record<PathParamNames<Path>, string | number | boolean>

type RouteMatcher = {
  readonly route: NaosRoute
  exec(pathname: string): Readonly<Record<string, string>> | null
}

type RouteElement = HTMLElement & {
  naosRoute?: NaosRouteMatch
}

type RouterPlatform = {
  readonly document: Document
  readonly history: History
  readonly location: Location
  addEventListener(name: "popstate", listener: EventListener): void
  getScrollPosition(): NaosScrollPosition
  removeEventListener(name: "popstate", listener: EventListener): void
  scrollTo(position: NaosScrollPosition): void
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => { readonly finished?: Promise<unknown> }
}

const ROUTER_EVENT_NAMES = new Set<string>([
  "naos:actioncommit",
  "naos:actionerror",
  "naos:actionstart",
  "naos:navigationabort",
  "naos:navigationcommit",
  "naos:navigationerror",
  "naos:navigationstart",
  "naos:routechange",
])

const MAX_REDIRECTS = 10
const SCROLL_STATE_KEY = "__naosScrollKey"

export function defineRoutes<const Routes extends readonly NaosRoute[]>(
  routes: Routes
): Routes {
  return routes
}

export function createRouter<const Routes extends readonly NaosRoute[]>(
  options: NaosRouterOptions<Routes>
): NaosRouter<Routes> {
  return new NaosRouter(options)
}

export function redirect(to: string | URL, options: { readonly replace?: boolean } = {}): NaosRedirect {
  return { replace: options.replace, to }
}

export class NaosRouter<Routes extends readonly NaosRoute[] = readonly NaosRoute[]> extends EventTarget {
  readonly basePath: string
  readonly outlet: Element
  readonly routes: Routes

  #activeController: AbortController | null = null
  #activeNavigation: NaosNavigation | null = null
  #currentMatch: NaosRouteMatch<Routes[number]> | null = null
  #currentScrollKey: string | null = null
  #focusRestoration: NaosFocusRestorationOptions | false
  #linkRoot: (ParentNode & EventTarget) | null
  #loadPromises = new WeakMap<NaosRoute | NaosFallbackRoute, Promise<unknown>>()
  #matchers: RouteMatcher[]
  #navigationId = 0
  #notFound: NaosFallbackRoute | null
  #error: NaosFallbackRoute | null
  #platform: RouterPlatform
  #previousNativeScrollRestoration: History["scrollRestoration"] | null = null
  #scrollKeyId = 0
  #scrollPositions = new Map<string, NaosScrollPosition>()
  #scrollRestoration: NaosScrollRestorationOptions | false
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
    this.#focusRestoration = normalizeFocusRestoration(options.focusRestoration)
    this.#scrollRestoration = normalizeScrollRestoration(options.scrollRestoration)
    this.#matchers = options.routes.map((route) => ({
      route,
      exec: compileRoutePath(route.path),
    }))
  }

  get currentMatch(): NaosRouteMatch<Routes[number]> | null {
    return this.#currentMatch
  }

  start(): void {
    if (this.#started) return
    this.#started = true
    this.#linkRoot?.addEventListener("click", this.#onClick)
    this.#linkRoot?.addEventListener("submit", this.#onSubmit)
    this.#platform.addEventListener("popstate", this.#onPopState)
    this.#startNativeScrollRestoration()
    void this.#navigateToUrl(this.#currentUrl(), {
      focus: false,
      history: "none",
      scroll: false,
      type: "load",
      viewTransition: false,
    })
  }

  stop(): void {
    if (!this.#started) return
    this.#started = false
    this.#linkRoot?.removeEventListener("click", this.#onClick)
    this.#linkRoot?.removeEventListener("submit", this.#onSubmit)
    this.#platform.removeEventListener("popstate", this.#onPopState)
    this.#stopNativeScrollRestoration()
    this.#activeController?.abort()
    this.#activeController = null
    this.#activeNavigation = null
  }

  href<Path extends RoutePath<Routes>>(
    path: Path,
    params?: NaosPathParams<Path>,
    options?: NaosHrefOptions
  ): string {
    const resolvedPath = interpolatePath(String(path), params ?? {})
    const pathname = joinBasePath(this.basePath, resolvedPath)
    return appendUrlParts(pathname, options)
  }

  match(to: string | URL): NaosRouteMatch<Routes[number]> | null {
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

  navigate(to: string | URL, options: NaosNavigateOptions = {}): Promise<NaosRouteMatch<Routes[number]> | null> {
    return this.#navigateToUrl(this.#resolveUrl(to), {
      focus: options.focus ?? true,
      history: options.replace ? "replace" : "push",
      scroll: options.scroll ?? true,
      type: options.replace ? "replace" : "push",
      viewTransition: options.viewTransition ?? false,
    })
  }

  replace(to: string | URL, options: Omit<NaosNavigateOptions, "replace"> = {}): Promise<NaosRouteMatch<Routes[number]> | null> {
    return this.navigate(to, { ...options, replace: true })
  }

  back(): void {
    this.#platform.history.back()
  }

  forward(): void {
    this.#platform.history.forward()
  }

  reload(options: Omit<NaosNavigateOptions, "replace"> = {}): Promise<NaosRouteMatch<Routes[number]> | null> {
    return this.replace(this.#currentUrl(), options)
  }

  async prefetch(to: string | URL): Promise<void> {
    const url = this.#resolveUrl(to)
    const matched = this.#findRoute(url)
    if (!matched) return
    const navigation = this.#createNavigation(url, "load")
    await this.#loadRoute(matched.route, navigation)
    await this.#runLoader(matched.route, {
      route: matched.route as Routes[number],
      url,
      params: matched.params,
      search: url.searchParams,
      navigation,
    })
  }

  submit(to: string | URL, options: NaosSubmitOptions = {}): Promise<NaosRouteMatch<Routes[number]> | null> {
    const url = this.#resolveUrl(to)
    const submission = normalizeSubmission(options)
    if (submission.method === "GET") {
      const targetUrl = appendFormDataToUrl(url, submission.formData)
      return this.#navigateToUrl(targetUrl, {
        focus: options.focus ?? true,
        history: options.replace ? "replace" : "push",
        scroll: options.scroll ?? true,
        type: options.replace ? "replace" : "push",
        viewTransition: options.viewTransition ?? false,
      })
    }

    return this.#submitToUrl(url, submission, {
      focus: options.focus ?? true,
      replace: options.replace ?? false,
      scroll: options.scroll ?? true,
      viewTransition: options.viewTransition ?? false,
    })
  }

  #onClick = (event: Event): void => {
    if (event.defaultPrevented || !isPlainLeftClick(event)) return
    const anchor = findAnchor(event.target)
    if (!anchor || !isRoutableAnchor(anchor)) return

    const url = new URL(anchor.href, this.#currentUrl())
    const currentUrl = this.#currentUrl()
    if (url.origin !== currentUrl.origin || this.#toInternalPath(url) === null) {
      return
    }

    if (url.pathname === currentUrl.pathname && url.search === currentUrl.search && url.hash) {
      return
    }

    event.preventDefault()
    void this.navigate(url, {
      viewTransition: anchor.hasAttribute("data-naos-view-transition"),
    })
  }

  #onSubmit = (event: Event): void => {
    if (event.defaultPrevented) return
    const form = event.target instanceof HTMLFormElement ? event.target : null
    if (!form || !isRoutableForm(form)) return

    const url = new URL(form.action || this.#currentUrl().href, this.#currentUrl())
    if (url.origin !== this.#currentUrl().origin || this.#toInternalPath(url) === null) {
      return
    }

    event.preventDefault()
    const submitter =
      typeof SubmitEvent !== "undefined" && event instanceof SubmitEvent && event.submitter instanceof HTMLElement
        ? event.submitter
        : null
    const formData = formDataFromForm(form, submitter)
    const method = normalizeMethod(form.method || "get")

    if (method === "GET") {
      void this.submit(url, {
        form,
        formData,
        method,
        submitter,
        viewTransition: form.hasAttribute("data-naos-view-transition"),
      })
      return
    }

    void this.submit(url, {
      form,
      formData,
      method,
      submitter,
      viewTransition: form.hasAttribute("data-naos-view-transition"),
    })
  }

  #onPopState = (): void => {
    void this.#navigateToUrl(this.#currentUrl(), {
      focus: true,
      history: "none",
      scroll: true,
      type: "traverse",
      viewTransition: false,
    })
  }

  async #navigateToUrl(
    url: URL,
    options: {
      readonly history: "none" | "push" | "replace"
      readonly focus: boolean
      readonly redirectCount?: number
      readonly scroll: boolean
      readonly type: NaosNavigationType
      readonly viewTransition: boolean
    }
  ): Promise<NaosRouteMatch<Routes[number]> | null> {
    this.#saveCurrentScrollPosition()
    if (this.#activeController && this.#activeNavigation) {
      const previousNavigation = this.#activeNavigation
      this.#activeController.abort()
      this.#dispatchRouterEvent("naos:navigationabort", {
        navigation: previousNavigation,
      })
    }

    const controller = new AbortController()
    const navigation: NaosNavigation = {
      id: ++this.#navigationId,
      url,
      from: this.#currentMatch?.url ?? null,
      type: options.type,
      signal: controller.signal,
    }

    this.#activeController = controller
    this.#activeNavigation = navigation
    this.#dispatchRouterEvent("naos:navigationstart", { navigation })

    try {
      const matched = this.#findRoute(url)
      const route = matched?.route ?? this.#notFound
      if (!route) return null

      const routeForMatch = normalizeFallbackRoute(route, matched?.route)
      const matchWithoutData = {
        route: routeForMatch as Routes[number],
        url,
        params: matched?.params ?? {},
        search: url.searchParams,
        navigation,
      } satisfies NaosRouteMatch<Routes[number]>

      const guard = "canEnter" in route && route.canEnter ? await route.canEnter(matchWithoutData) : true
      if (!this.#isCurrent(navigation)) return null
      if (guard === false) return null
      if (typeof guard === "string" || guard instanceof URL) {
        const redirectCount = options.redirectCount ?? 0
        if (redirectCount >= MAX_REDIRECTS) {
          throw new Error(`Router redirect limit exceeded while navigating to "${url.pathname}".`)
        }
        return this.#navigateToUrl(this.#resolveUrl(guard), {
          focus: options.focus,
          history: "replace",
          redirectCount: redirectCount + 1,
          scroll: options.scroll,
          type: "replace",
          viewTransition: options.viewTransition,
        })
      }

      await this.#loadRoute(route, navigation)
      if (!this.#isCurrent(navigation)) return null

      const data = await this.#runLoader(route, matchWithoutData)
      if (!this.#isCurrent(navigation)) return null

      const match = { ...matchWithoutData, data } satisfies NaosRouteMatch<Routes[number]>

      if (options.history === "push") {
        this.#platform.history.pushState(this.#historyStateFor(url, navigation, "push"), "", url)
      } else if (options.history === "replace") {
        this.#platform.history.replaceState(this.#historyStateFor(url, navigation, "replace"), "", url)
      }

      await this.#commit(match, route, {
        focus: options.focus,
        scroll: options.scroll,
        viewTransition: options.viewTransition,
      })
      return match
    } catch (error) {
      if (!this.#isCurrent(navigation)) return null
      this.#dispatchRouterEvent("naos:navigationerror", { error, navigation })
      if (this.#error) {
        const errorRoute = normalizeFallbackRoute(this.#error)
        const match = {
          route: errorRoute as Routes[number],
          url,
          params: {},
          search: url.searchParams,
          navigation,
        } satisfies NaosRouteMatch<Routes[number]>
        await this.#commit(match, this.#error, {
          focus: options.focus,
          scroll: options.scroll,
          viewTransition: false,
        })
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

  async #submitToUrl(
    url: URL,
    submission: NaosActionSubmission,
    options: {
      readonly focus: boolean
      readonly replace: boolean
      readonly scroll: boolean
      readonly viewTransition: boolean
    }
  ): Promise<NaosRouteMatch<Routes[number]> | null> {
    this.#saveCurrentScrollPosition()
    if (this.#activeController && this.#activeNavigation) {
      const previousNavigation = this.#activeNavigation
      this.#activeController.abort()
      this.#dispatchRouterEvent("naos:navigationabort", {
        navigation: previousNavigation,
      })
    }

    const controller = new AbortController()
    const navigation: NaosNavigation = {
      id: ++this.#navigationId,
      url,
      from: this.#currentMatch?.url ?? null,
      type: "action",
      signal: controller.signal,
    }

    this.#activeController = controller
    this.#activeNavigation = navigation
    this.#dispatchRouterEvent("naos:navigationstart", { navigation })
    this.#dispatchRouterEvent("naos:actionstart", { navigation, submission })

    try {
      const matched = this.#findRoute(url)
      const route = matched?.route
      if (!route) return null

      const matchWithoutData = {
        route: route as Routes[number],
        url,
        params: matched.params,
        search: url.searchParams,
        navigation,
      } satisfies NaosRouteMatch<Routes[number]>

      await this.#loadRoute(route, navigation)
      if (!this.#isCurrent(navigation)) return null

      if (!route.action) {
        throw new Error(`Route "${route.path}" does not define an action.`)
      }

      const actionData = await route.action({
        ...this.#loaderArgs(route, matchWithoutData),
        request: createActionRequest(url, navigation, submission),
        ...submission,
      })
      if (!this.#isCurrent(navigation)) return null

      if (isRedirect(actionData)) {
        this.#clearActiveNavigation(navigation)
        this.#dispatchRouterEvent("naos:actioncommit", {
          data: actionData,
          match: matchWithoutData,
          navigation,
          submission,
        })
        const replace = actionData.replace ?? options.replace
        return this.#navigateToUrl(this.#resolveUrl(actionData.to), {
          focus: options.focus,
          history: replace ? "replace" : "push",
          redirectCount: 1,
          scroll: options.scroll,
          type: replace ? "replace" : "push",
          viewTransition: options.viewTransition,
        })
      }

      const data = await this.#runLoader(route, {
        ...matchWithoutData,
        actionData,
      })
      if (!this.#isCurrent(navigation)) return null

      const match = {
        ...matchWithoutData,
        actionData,
        data,
      } satisfies NaosRouteMatch<Routes[number]>

      const currentUrl = this.#currentUrl()
      if (options.replace) {
        this.#platform.history.replaceState(this.#historyStateFor(url, navigation, "replace"), "", url)
      } else if (currentUrl.href !== url.href) {
        this.#platform.history.pushState(this.#historyStateFor(url, navigation, "push"), "", url)
      }

      await this.#commit(match, route, {
        focus: options.focus,
        scroll: options.scroll,
        viewTransition: options.viewTransition,
      })
      this.#dispatchRouterEvent("naos:actioncommit", {
        data: actionData,
        match,
        navigation,
        submission,
      })
      return match
    } catch (error) {
      if (!this.#isCurrent(navigation)) return null
      this.#dispatchRouterEvent("naos:actionerror", { error, navigation, submission })
      this.#dispatchRouterEvent("naos:navigationerror", { error, navigation })
      if (this.#error) {
        const errorRoute = normalizeFallbackRoute(this.#error)
        const match = {
          route: errorRoute as Routes[number],
          url,
          params: {},
          search: url.searchParams,
          navigation,
        } satisfies NaosRouteMatch<Routes[number]>
        await this.#commit(match, this.#error, {
          focus: options.focus,
          scroll: options.scroll,
          viewTransition: false,
        })
        return match
      }
      throw error
    } finally {
      this.#clearActiveNavigation(navigation)
    }
  }

  async #commit(
    match: NaosRouteMatch<Routes[number]>,
    route: NaosRoute | NaosFallbackRoute,
    options: {
      readonly focus: boolean
      readonly scroll: boolean
      readonly viewTransition: boolean
    }
  ): Promise<void> {
    const commit = () => {
      this.#mount(match, route)
      this.#currentMatch = match
      this.#updateTitle(match, route)
      this.#updateActiveLinks(match.url)
      this.#dispatchRouterEvent("naos:navigationcommit", {
        match,
        navigation: match.navigation,
      })
      this.#dispatchRouterEvent("naos:routechange", {
        match,
        navigation: match.navigation,
      })
    }

    const documentWithTransitions = this.#platform.document as ViewTransitionDocument
    if (options.viewTransition && typeof documentWithTransitions.startViewTransition === "function") {
      const transition = documentWithTransitions.startViewTransition(commit)
      await transition.finished
    } else {
      commit()
    }

    this.#currentScrollKey = this.#resolveScrollKey(match.url, match.navigation)
    if (options.scroll) this.#restoreScroll(match)
    if (options.focus) this.#restoreFocus(match, route)
  }

  #mount(match: NaosRouteMatch<Routes[number]>, route: NaosRoute | NaosFallbackRoute): void {
    const element = createRouteElement(this.#platform.document, route, match)
    const props = route.props?.(match) ?? {}
    for (const [name, value] of Object.entries(props)) {
      ;(element as unknown as Record<string, unknown>)[name] = value
    }

    element.naosRoute = match

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

  #findRoute(url: URL): { readonly params: Readonly<Record<string, string>>; readonly route: NaosRoute } | null {
    const pathname = this.#toInternalPath(url)
    if (pathname === null) return null
    for (const matcher of this.#matchers) {
      const params = matcher.exec(pathname)
      if (params) return { params, route: matcher.route }
    }
    return null
  }

  #loadRoute(route: NaosRoute | NaosFallbackRoute, navigation: NaosNavigation): Promise<unknown> {
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

  async #runLoader<Route extends NaosRoute | NaosFallbackRoute>(
    route: Route,
    match: NaosRouteMatch
  ): Promise<unknown> {
    if (!route.loader) return undefined
    return route.loader(this.#loaderArgs(route, match))
  }

  #loaderArgs<Route extends NaosRoute | NaosFallbackRoute>(
    route: Route,
    match: NaosRouteMatch
  ): NaosLoaderArgs {
    return {
      navigation: match.navigation,
      params: match.params,
      request: createLoaderRequest(match.url, match.navigation),
      route: normalizeFallbackRoute(route),
      search: match.search,
      url: match.url,
    }
  }

  #dispatchRouterEvent<Name extends NaosRouterEventName>(
    name: Name,
    detail: NaosRouterEventMap<Routes>[Name]
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

      const matchMode = anchor.getAttribute("data-naos-active-match") === "prefix" ? "prefix" : "exact"
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

  #updateTitle(match: NaosRouteMatch<Routes[number]>, route: NaosRoute | NaosFallbackRoute): void {
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

  #createNavigation(url: URL, type: NaosNavigationType): NaosNavigation {
    return {
      id: this.#navigationId,
      url,
      from: this.#currentMatch?.url ?? null,
      type,
      signal: this.#activeController?.signal ?? new AbortController().signal,
    }
  }

  #isCurrent(navigation: NaosNavigation): boolean {
    return this.#activeNavigation?.id === navigation.id && !navigation.signal.aborted
  }

  #clearActiveNavigation(navigation: NaosNavigation): void {
    if (this.#activeNavigation?.id === navigation.id) {
      this.#activeController = null
      this.#activeNavigation = null
    }
  }

  #historyStateFor(
    url: URL,
    navigation: NaosNavigation,
    mode: "push" | "replace"
  ): unknown {
    if (this.#scrollRestoration === false || this.#scrollRestoration.getKey) {
      return null
    }

    const existing = mode === "replace" ? readScrollKeyFromState(this.#platform.history.state) : null
    const key = existing ?? this.#createScrollKey(url, navigation)
    return addScrollKeyToState(mode === "replace" ? this.#platform.history.state : null, key)
  }

  #restoreFocus(
    match: NaosRouteMatch<Routes[number]>,
    route: NaosRoute | NaosFallbackRoute
  ): void {
    if (this.#focusRestoration === false) return
    const target = findFocusTarget(this.outlet, match, route, this.#focusRestoration)
    focusElement(target)
  }

  #restoreScroll(match: NaosRouteMatch<Routes[number]>): void {
    if (this.#scrollRestoration === false) return

    if (match.navigation.type === "traverse") {
      const key = this.#resolveScrollKey(match.url, match.navigation)
      const position = this.#scrollPositions.get(key)
      this.#platform.scrollTo(position ?? { x: 0, y: 0 })
      return
    }

    const target = findHashTarget(this.#platform.document, match.url)
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView()
      return
    }

    this.#platform.scrollTo({ x: 0, y: 0 })
  }

  #resolveScrollKey(url: URL, navigation: NaosNavigation | null): string {
    if (this.#scrollRestoration && this.#scrollRestoration.getKey) {
      return this.#scrollRestoration.getKey({
        navigation,
        state: this.#platform.history.state,
        url,
      })
    }

    const stateKey = readScrollKeyFromState(this.#platform.history.state)
    if (stateKey) return stateKey
    return `${url.pathname}${url.search}${url.hash}`
  }

  #saveCurrentScrollPosition(): void {
    if (this.#scrollRestoration === false) return
    const url = this.#currentMatch?.url ?? this.#currentUrl()
    const key = this.#currentScrollKey ?? this.#resolveScrollKey(url, this.#activeNavigation)
    this.#currentScrollKey = key
    this.#scrollPositions.set(key, this.#platform.getScrollPosition())
  }

  #createScrollKey(url: URL, navigation: NaosNavigation | null): string {
    if (this.#scrollRestoration && this.#scrollRestoration.getKey) {
      return this.#scrollRestoration.getKey({
        navigation,
        state: this.#platform.history.state,
        url,
      })
    }
    this.#scrollKeyId += 1
    return `${url.pathname}${url.search}${url.hash}:${this.#scrollKeyId}`
  }

  #startNativeScrollRestoration(): void {
    if (this.#scrollRestoration === false || !("scrollRestoration" in this.#platform.history)) return
    this.#previousNativeScrollRestoration = this.#platform.history.scrollRestoration
    this.#platform.history.scrollRestoration = "manual"
    this.#currentScrollKey = this.#ensureCurrentHistoryScrollKey()
  }

  #stopNativeScrollRestoration(): void {
    if (this.#previousNativeScrollRestoration === null || !("scrollRestoration" in this.#platform.history)) return
    this.#platform.history.scrollRestoration = this.#previousNativeScrollRestoration
    this.#previousNativeScrollRestoration = null
  }

  #ensureCurrentHistoryScrollKey(): string {
    const url = this.#currentUrl()
    if (this.#scrollRestoration && this.#scrollRestoration.getKey) {
      return this.#scrollRestoration.getKey({
        navigation: null,
        state: this.#platform.history.state,
        url,
      })
    }

    const existing = readScrollKeyFromState(this.#platform.history.state)
    if (existing) return existing

    const key = this.#createScrollKey(url, null)
    this.#platform.history.replaceState(addScrollKeyToState(this.#platform.history.state, key), "", url)
    return key
  }
}

function defaultPlatform(): RouterPlatform {
  return {
    document: window.document,
    history: window.history,
    location: window.location,
    addEventListener: (name, listener) => window.addEventListener(name, listener),
    getScrollPosition: () => ({ x: window.scrollX, y: window.scrollY }),
    removeEventListener: (name, listener) => window.removeEventListener(name, listener),
    scrollTo: (position) => window.scrollTo(position.x, position.y),
  }
}

function defaultLinkRoot(): (ParentNode & EventTarget) | null {
  return typeof document === "undefined" ? null : document
}

function normalizeFocusRestoration(
  value: boolean | NaosFocusRestorationOptions | undefined
): NaosFocusRestorationOptions | false {
  if (value === false) return false
  if (value === true || value === undefined) return {}
  return value
}

function normalizeScrollRestoration(
  value: boolean | NaosScrollRestorationOptions | undefined
): NaosScrollRestorationOptions | false {
  if (value === false) return false
  if (value === true || value === undefined) return {}
  return value
}

function readScrollKeyFromState(state: unknown): string | null {
  if (!isRecord(state)) return null
  const key = state[SCROLL_STATE_KEY]
  return typeof key === "string" ? key : null
}

function addScrollKeyToState(state: unknown, key: string): Record<string, unknown> {
  return isRecord(state) ? { ...state, [SCROLL_STATE_KEY]: key } : { [SCROLL_STATE_KEY]: key }
}

function findHashTarget(document: Document, url: URL): Element | null {
  if (!url.hash) return null
  const id = decodeHash(url.hash)
  if (!id) return null
  return document.getElementById(id) ?? document.getElementsByName(id)[0] ?? null
}

function decodeHash(hash: string): string {
  try {
    return decodeURIComponent(hash.slice(1))
  } catch {
    return hash.slice(1)
  }
}

function findFocusTarget(
  outlet: Element,
  match: NaosRouteMatch,
  route: NaosRoute | NaosFallbackRoute,
  options: NaosFocusRestorationOptions
): Element | null {
  const routeElement = outlet.firstElementChild ?? outlet
  return (
    resolveFocusTarget(route.focusTarget, match, routeElement) ??
    resolveFocusTarget(options.target, match, routeElement) ??
    queryWithin(routeElement, "[autofocus]") ??
    queryWithin(routeElement, "main") ??
    queryWithin(routeElement, "h1,h2,h3,h4,h5,h6") ??
    outlet
  )
}

function resolveFocusTarget(
  target: NaosFocusTarget | undefined,
  match: NaosRouteMatch,
  root: Element
): Element | null {
  if (!target) return null
  if (typeof target === "function") return target(match) ?? null
  return queryWithin(root, target)
}

function queryWithin(root: Element, selector: string): Element | null {
  try {
    if (root.matches(selector)) return root
    return root.querySelector(selector)
  } catch {
    return null
  }
}

function focusElement(element: Element | null): void {
  if (!element || typeof (element as HTMLElement).focus !== "function") return
  const focusTarget = element as HTMLElement
  if (!focusTarget.hasAttribute("tabindex") && !isNaturallyFocusable(focusTarget)) {
    focusTarget.tabIndex = -1
  }
  try {
    focusTarget.focus({ preventScroll: true })
  } catch {
    focusTarget.focus()
  }
}

function isNaturallyFocusable(element: HTMLElement): boolean {
  return element.matches("a[href],button,input,select,textarea,summary,iframe,[tabindex]")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function createRouteElement(
  document: Document,
  route: NaosRoute | NaosFallbackRoute,
  match: NaosRouteMatch
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
  route: NaosRoute | NaosFallbackRoute,
  matchedRoute?: NaosRoute
): NaosRoute {
  if (matchedRoute) return matchedRoute
  return { ...route, path: route.path ?? "*" } as NaosRoute
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

function isRoutableForm(form: HTMLFormElement): boolean {
  return form.hasAttribute("data-naos-action") && !form.target && normalizeMethod(form.method || "get") !== "DIALOG"
}

function normalizeSubmission(options: NaosSubmitOptions): NaosActionSubmission {
  return {
    form: options.form ?? null,
    formData: normalizeFormData(options.formData ?? options.form ?? new FormData()),
    method: normalizeMethod(options.method ?? options.form?.method ?? "post"),
    submitter: options.submitter ?? null,
  }
}

function normalizeFormData(
  value: NonNullable<NaosSubmitOptions["formData"]> | HTMLFormElement
): FormData {
  if (typeof HTMLFormElement !== "undefined" && value instanceof HTMLFormElement) return formDataFromForm(value, null)
  if (value instanceof FormData) return value

  const formData = new FormData()
  if (value instanceof URLSearchParams) {
    for (const [name, entryValue] of value) {
      formData.append(name, entryValue)
    }
    return formData
  }

  for (const [name, entryValue] of Object.entries(value)) {
    if (entryValue === null || entryValue === undefined) continue
    const isFile = typeof File !== "undefined" && entryValue instanceof File
    formData.append(name, typeof entryValue === "string" || isFile ? entryValue : String(entryValue))
  }
  return formData
}

function formDataFromForm(form: HTMLFormElement, submitter: HTMLElement | null): FormData {
  if (!submitter) return new FormData(form)
  try {
    return new FormData(form, submitter)
  } catch {
    return new FormData(form)
  }
}

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase() || "GET"
}

function appendFormDataToUrl(url: URL, formData: FormData): URL {
  const next = new URL(url)
  const params = new URLSearchParams()
  for (const [name, value] of formData) {
    params.append(name, typeof value === "string" ? value : value.name)
  }
  next.search = params.toString()
  return next
}

function createLoaderRequest(url: URL, navigation: NaosNavigation): Request {
  return new Request(url, {
    method: "GET",
    signal: navigation.signal,
  })
}

function createActionRequest(url: URL, navigation: NaosNavigation, submission: NaosActionSubmission): Request {
  return new Request(url, {
    body: submission.method === "GET" || submission.method === "HEAD" ? undefined : submission.formData,
    method: submission.method,
    signal: navigation.signal,
  })
}

function isRedirect(value: unknown): value is NaosRedirect {
  return Boolean(value && typeof value === "object" && "to" in value)
}

function compileRoutePath(path: string): (pathname: string) => Readonly<Record<string, string>> | null {
  const normalizedPath = normalizeRoutePath(path)
  if (typeof URLPattern === "function" && normalizedPath !== "*") {
    try {
      const pattern = new URLPattern({ pathname: normalizedPath }, "https://naos.local")
      return (pathname) => {
        const result = pattern.exec(new URL(pathname, "https://naos.local"))
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

function appendUrlParts(pathname: string, options: NaosHrefOptions | undefined): string {
  if (!options) return pathname
  const search = formatSearch(options.search)
  const hash = options.hash ? (options.hash.startsWith("#") ? options.hash : `#${options.hash}`) : ""
  return `${pathname}${search}${hash}`
}

function formatSearch(search: NaosHrefOptions["search"]): string {
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
