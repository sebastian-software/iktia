export type DisabledResourceKey = null | undefined | false

export type EnabledResourceKey = string | readonly unknown[] | Record<string, unknown>

export type ResourceKey = EnabledResourceKey | DisabledResourceKey

export type NormalizedResourceKey<Key extends ResourceKey = ResourceKey> =
  | {
      readonly disabled: true
      readonly argument: Key
      readonly key: undefined
    }
  | {
      readonly disabled: false
      readonly argument: Exclude<Key, DisabledResourceKey>
      readonly key: string
    }

export type ResourceState<Data, Error = unknown> =
  | {
      readonly status: "pending"
      readonly data?: Data
      readonly error?: undefined
      readonly stale?: boolean
    }
  | {
      readonly status: "success"
      readonly data: Data
      readonly error?: undefined
      readonly stale?: boolean
    }
  | {
      readonly status: "error"
      readonly data?: Data
      readonly error: Error
      readonly stale?: boolean
    }

export type ResourceMutateOptions<Data, MutationData = Data> = {
  optimisticData?: Data | ((current: Data | undefined) => Data)
  populateCache?: boolean | ((result: MutationData, current: Data | undefined) => Data)
  revalidate?: boolean
  rollbackOnError?: boolean | ((error: unknown) => boolean)
}

export type Resource<Data, Error = unknown> = {
  readonly key: string | undefined
  snapshot(): ResourceState<Data, Error>
  subscribe(callback: () => void): () => void
  refetch?(): Promise<Data>
  mutate?<MutationData = Data>(
    next:
      | MutationData
      | Promise<MutationData>
      | ((current: Data | undefined) => MutationData | Promise<MutationData>),
    options?: ResourceMutateOptions<Data, MutationData>
  ): Promise<MutationData | undefined>
  dispose(): void
}

export type ResourceFetchContext = {
  readonly signal: AbortSignal
}

export type ResourceFetchOptions<Data> = {
  initialData?: Data
  revalidateIfStale?: boolean
}

export type ResourceFetcher<Data, Key extends EnabledResourceKey> = (
  key: Key,
  context: ResourceFetchContext
) => Data | Promise<Data>

export type SubscriptionNext<Data, Error = unknown> = (
  error: Error | null | undefined,
  data?: Data | ((current: Data | undefined) => Data)
) => void

export type ResourceSubscriptionContext<Data, Error = unknown> = {
  readonly next: SubscriptionNext<Data, Error>
  readonly signal: AbortSignal
}

export type ResourceSubscriber<Data, Key extends EnabledResourceKey, Error = unknown> = (
  key: Key,
  context: ResourceSubscriptionContext<Data, Error>
) => () => void

type CacheEntry<Data, Error> = {
  state: ResourceState<Data, Error>
  listeners: Set<() => void>
}

type InflightFetch<Data> = {
  controller: AbortController
  promise: Promise<Data>
  references: number
}

type ActiveSubscription = {
  controller: AbortController
  dispose: () => void
  references: number
}

export class ResourceCache {
  readonly #entries = new Map<string, CacheEntry<unknown, unknown>>()
  readonly #fetches = new Map<string, InflightFetch<unknown>>()
  readonly #subscriptions = new Map<string, ActiveSubscription>()

  snapshot<Data, Error = unknown>(key: string | undefined): ResourceState<Data, Error> {
    if (key === undefined) {
      return { status: "pending" }
    }

    return (this.#entries.get(key)?.state as ResourceState<Data, Error> | undefined) ?? { status: "pending" }
  }

  set<Data, Error = unknown>(key: string, state: ResourceState<Data, Error>): void {
    const entry = this.#entry<Data, Error>(key)
    entry.state = state
    for (const listener of entry.listeners) {
      listener()
    }
  }

  subscribe(key: string | undefined, callback: () => void): () => void {
    if (key === undefined) {
      return () => {}
    }

    const entry = this.#entry(key)
    entry.listeners.add(callback)
    return () => {
      entry.listeners.delete(callback)
    }
  }

  mutate<Data, MutationData = Data>(
    key: string,
    next:
      | MutationData
      | Promise<MutationData>
      | ((current: Data | undefined) => MutationData | Promise<MutationData>),
    options: ResourceMutateOptions<Data, MutationData> = {}
  ): Promise<MutationData | undefined> {
    const previous = this.snapshot<Data>(key)
    const current = stateData(previous)
    const rollbackOnError = options.rollbackOnError ?? true

    if (options.optimisticData !== undefined) {
      const optimistic =
        typeof options.optimisticData === "function"
          ? (options.optimisticData as (current: Data | undefined) => Data)(current)
          : options.optimisticData
      this.set(key, { data: optimistic, status: "success" })
    }

    return Promise.resolve(typeof next === "function" ? (next as (current: Data | undefined) => MutationData)(current) : next)
      .then((result) => {
        if (options.populateCache !== false) {
          const latest = stateData(this.snapshot<Data>(key))
          const data =
            typeof options.populateCache === "function"
              ? options.populateCache(result, latest)
              : (result as unknown as Data)
          this.set(key, { data, status: "success" })
        }
        return result
      })
      .catch((error: unknown) => {
        const shouldRollback =
          typeof rollbackOnError === "function" ? rollbackOnError(error) : rollbackOnError
        if (shouldRollback) {
          this.set(key, previous)
        }
        throw error
      })
  }

  startFetch<Data, Error, Key extends EnabledResourceKey>(
    key: string,
    argument: Key,
    fetcher: ResourceFetcher<Data, Key>,
    options: ResourceFetchOptions<Data> = {}
  ): { promise: Promise<Data>; release: () => void } {
    const previous = this.snapshot<Data, Error>(key)
    if (previous.status === "success" && options.revalidateIfStale === false) {
      return {
        promise: Promise.resolve(previous.data),
        release: () => {},
      }
    }

    const existing = this.#fetches.get(key) as InflightFetch<Data> | undefined
    if (existing) {
      existing.references += 1
      return {
        promise: existing.promise,
        release: () => this.#releaseFetch(key),
      }
    }

    const previousData = stateData(previous)
    const initialData = previousData ?? options.initialData
    if (initialData !== undefined) {
      this.set<Data, Error>(key, { data: initialData, stale: true, status: "success" })
    } else {
      this.set<Data, Error>(key, { status: "pending" })
    }

    const controller = new AbortController()
    const promise = Promise.resolve()
      .then(() => fetcher(argument, { signal: controller.signal }))
      .then((data) => {
        if (!controller.signal.aborted) {
          this.set<Data, Error>(key, { data, status: "success" })
        }
        return data
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          const data = stateData(this.snapshot<Data, Error>(key))
          this.set<Data, Error>(key, data === undefined ? { error, status: "error" } : { data, error, status: "error" })
        }
        throw error
      })
      .finally(() => {
        this.#fetches.delete(key)
      })

    promise.catch(() => {})
    this.#fetches.set(key, { controller, promise, references: 1 })
    return {
      promise,
      release: () => this.#releaseFetch(key),
    }
  }

  attachSubscription<Data, Error, Key extends EnabledResourceKey>(
    key: string,
    argument: Key,
    subscriber: ResourceSubscriber<Data, Key, Error>
  ): () => void {
    const existing = this.#subscriptions.get(key)
    if (existing) {
      existing.references += 1
      return () => this.#releaseSubscription(key)
    }

    const controller = new AbortController()
    const next: SubscriptionNext<Data, Error> = (error, data) => {
      if (controller.signal.aborted) {
        return
      }

      if (error !== null && error !== undefined) {
        const previousData = stateData(this.snapshot<Data, Error>(key))
        this.set<Data, Error>(
          key,
          previousData === undefined ? { error, status: "error" } : { data: previousData, error, status: "error" }
        )
        return
      }

      if (typeof data === "function") {
        const previousData = stateData(this.snapshot<Data, Error>(key))
        this.set<Data, Error>(key, {
          data: (data as (current: Data | undefined) => Data)(previousData),
          status: "success",
        })
        return
      }

      if (data !== undefined) {
        this.set<Data, Error>(key, { data, status: "success" })
      }
    }

    const dispose = subscriber(argument, { next, signal: controller.signal })
    this.#subscriptions.set(key, { controller, dispose, references: 1 })
    return () => this.#releaseSubscription(key)
  }

  #entry<Data, Error = unknown>(key: string): CacheEntry<Data, Error> {
    let entry = this.#entries.get(key)
    if (!entry) {
      entry = { listeners: new Set(), state: { status: "pending" } }
      this.#entries.set(key, entry)
    }
    return entry as CacheEntry<Data, Error>
  }

  #releaseFetch(key: string): void {
    const fetch = this.#fetches.get(key)
    if (!fetch) {
      return
    }

    fetch.references -= 1
    if (fetch.references <= 0) {
      fetch.controller.abort()
      this.#fetches.delete(key)
    }
  }

  #releaseSubscription(key: string): void {
    const subscription = this.#subscriptions.get(key)
    if (!subscription) {
      return
    }

    subscription.references -= 1
    if (subscription.references <= 0) {
      subscription.controller.abort()
      subscription.dispose()
      this.#subscriptions.delete(key)
    }
  }
}

export const defaultResourceCache = new ResourceCache()

export function normalizeResourceKey<Key extends ResourceKey>(key: Key): NormalizedResourceKey<Key> {
  if (key === null || key === undefined || key === false) {
    return { argument: key, disabled: true, key: undefined }
  }

  if (typeof key === "string") {
    return { argument: key as Exclude<Key, DisabledResourceKey>, disabled: false, key }
  }

  return {
    argument: key as Exclude<Key, DisabledResourceKey>,
    disabled: false,
    key: stableStringify(key),
  }
}

export function fetchResource<Data, Key extends ResourceKey>(
  key: Key,
  fetcher: ResourceFetcher<Data, Exclude<Key, DisabledResourceKey> & EnabledResourceKey>,
  options: ResourceFetchOptions<Data> & { cache?: ResourceCache } = {}
): Resource<Data> {
  const cache = options.cache ?? defaultResourceCache
  const normalized = normalizeResourceKey(key)
  if (normalized.disabled) {
    return disabledResource<Data>()
  }

  const resourceKey = normalized.key
  const resourceArgument = normalized.argument as Exclude<Key, DisabledResourceKey> & EnabledResourceKey
  let releaseFetch = startFetch(false).release
  let disposed = false

  function startFetch(force: boolean): { promise: Promise<Data>; release: () => void } {
    return cache.startFetch(
      resourceKey,
      resourceArgument,
      fetcher,
      force ? { ...options, revalidateIfStale: true } : options
    )
  }

  function refetch(): Promise<Data> {
    releaseFetch()
    const fetch = startFetch(true)
    releaseFetch = fetch.release
    return fetch.promise
  }

  return {
    key: resourceKey,
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      releaseFetch()
    },
    mutate(next, mutateOptions) {
      return cache.mutate(resourceKey, next, mutateOptions).then(async (result) => {
        if (mutateOptions?.revalidate) {
          await refetch()
        }
        return result
      })
    },
    refetch,
    snapshot() {
      return cache.snapshot<Data>(resourceKey)
    },
    subscribe(callback) {
      return cache.subscribe(resourceKey, callback)
    },
  }
}

export function subscriptionResource<Data, Key extends ResourceKey, Error = unknown>(
  key: Key,
  subscriber: ResourceSubscriber<Data, Exclude<Key, DisabledResourceKey> & EnabledResourceKey, Error>,
  options: { cache?: ResourceCache; initialData?: Data } = {}
): Resource<Data, Error> {
  const cache = options.cache ?? defaultResourceCache
  const normalized = normalizeResourceKey(key)
  if (normalized.disabled) {
    return disabledResource<Data, Error>()
  }

  if (options.initialData !== undefined) {
    cache.set<Data, Error>(normalized.key, { data: options.initialData, status: "success" })
  }

  const releaseSubscription = cache.attachSubscription(
    normalized.key,
    normalized.argument as Exclude<Key, DisabledResourceKey> & EnabledResourceKey,
    subscriber
  )
  let disposed = false

  return {
    key: normalized.key,
    dispose() {
      if (disposed) {
        return
      }
      disposed = true
      releaseSubscription()
    },
    mutate(next, mutateOptions) {
      return cache.mutate(normalized.key, next, mutateOptions)
    },
    snapshot() {
      return cache.snapshot<Data, Error>(normalized.key)
    },
    subscribe(callback) {
      return cache.subscribe(normalized.key, callback)
    },
  }
}

function disabledResource<Data, Error = unknown>(): Resource<Data, Error> {
  return {
    key: undefined,
    dispose() {},
    snapshot() {
      return { status: "pending" }
    },
    subscribe() {
      return () => {}
    },
  }
}

function stateData<Data>(state: ResourceState<Data>): Data | undefined {
  return state.data
}

function stableStringify(value: unknown): string {
  if (typeof value === "bigint" || typeof value === "function" || typeof value === "symbol") {
    throw new TypeError("Resource keys must be JSON-serializable values.")
  }

  if (value === undefined) {
    return "undefined"
  }

  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? String(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`
  }

  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`
}
