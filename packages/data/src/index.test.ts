import { describe, expect, it, vi } from "vitest"

import {
  ResourceCache,
  fetchResource,
  normalizeResourceKey,
  subscriptionResource,
} from "./index.js"

describe("resource keys", () => {
  it("treats nullish and false keys as disabled", () => {
    expect(normalizeResourceKey(null)).toEqual({ argument: null, disabled: true, key: undefined })
    expect(normalizeResourceKey(undefined)).toEqual({ argument: undefined, disabled: true, key: undefined })
    expect(normalizeResourceKey(false)).toEqual({ argument: false, disabled: true, key: undefined })
  })

  it("normalizes object keys with stable property order", () => {
    expect(normalizeResourceKey({ b: 1, a: ["x", { c: true }] }).key).toBe(
      normalizeResourceKey({ a: ["x", { c: true }], b: 1 }).key
    )
  })
})

describe("fetchResource", () => {
  it("does not call the fetcher for disabled keys", async () => {
    const fetcher = vi.fn()
    const resource = fetchResource(null, fetcher)

    await Promise.resolve()

    expect(fetcher).not.toHaveBeenCalled()
    expect(resource.snapshot()).toEqual({ status: "pending" })
  })

  it("loads data and notifies subscribers", async () => {
    const cache = new ResourceCache()
    const listener = vi.fn()
    const resource = fetchResource("task-list", async () => ["a", "b"], { cache })
    resource.subscribe(listener)

    await waitForSnapshot(resource, { data: ["a", "b"], status: "success" })

    expect(resource.snapshot()).toEqual({ data: ["a", "b"], status: "success" })
    expect(listener).toHaveBeenCalled()
  })

  it("dedupes in-flight fetches by normalized key", async () => {
    const cache = new ResourceCache()
    const fetcher = vi.fn(async () => ({ name: "Ada" }))

    const left = fetchResource(["profile", 1], fetcher, { cache })
    const right = fetchResource(["profile", 1], fetcher, { cache })

    await waitForSnapshot(left, { data: { name: "Ada" }, status: "success" })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(left.snapshot()).toEqual({ data: { name: "Ada" }, status: "success" })
    expect(right.snapshot()).toEqual({ data: { name: "Ada" }, status: "success" })
  })

  it("aborts an in-flight fetch when the last resource is disposed", async () => {
    const cache = new ResourceCache()
    let signal: AbortSignal | undefined
    const resource = fetchResource(
      "slow",
      (_key, context) =>
        new Promise<string>(() => {
          signal = context.signal
        }),
      { cache }
    )

    await Promise.resolve()
    resource.dispose()

    expect(signal?.aborted).toBe(true)
  })

  it("keeps cached data as stale while refetching", async () => {
    const cache = new ResourceCache()
    const fetcher = vi.fn(async () => (fetcher.mock.calls.length === 1 ? "first" : "second"))

    const first = fetchResource("cache-key", fetcher, { cache })
    await waitForSnapshot(first, { data: "first", status: "success" })
    await Promise.resolve()
    expect(first.snapshot()).toEqual({ data: "first", status: "success" })

    const second = fetchResource("cache-key", fetcher, { cache })
    expect(second.snapshot()).toEqual({ data: "first", stale: true, status: "success" })

    await waitForSnapshot(second, { data: "second", status: "success" })
    expect(second.snapshot()).toEqual({ data: "second", status: "success" })
  })

  it("can reuse cached data without stale revalidation", async () => {
    const cache = new ResourceCache()
    const fetcher = vi.fn(async () => "cached")

    const first = fetchResource("cache-key", fetcher, { cache })
    await waitForSnapshot(first, { data: "cached", status: "success" })
    await Promise.resolve()

    const second = fetchResource("cache-key", fetcher, {
      cache,
      revalidateIfStale: false,
    })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(second.snapshot()).toEqual({ data: "cached", status: "success" })
  })

  it("still refetches explicitly when stale revalidation is disabled", async () => {
    const cache = new ResourceCache()
    const fetcher = vi.fn(async () => (fetcher.mock.calls.length === 1 ? "cached" : "fresh"))

    const resource = fetchResource("cache-key", fetcher, {
      cache,
      revalidateIfStale: false,
    })
    await waitForSnapshot(resource, { data: "cached", status: "success" })

    await resource.refetch?.()

    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(resource.snapshot()).toEqual({ data: "fresh", status: "success" })
  })

  it("supports optimistic mutation rollback", async () => {
    const cache = new ResourceCache()
    const resource = fetchResource("count", async () => 1, { cache })
    await waitForSnapshot(resource, { data: 1, status: "success" })

    await expect(
      resource.mutate?.(Promise.reject(new Error("nope")), {
        optimisticData: 2,
        rollbackOnError: true,
      })
    ).rejects.toThrow("nope")

    expect(resource.snapshot()).toEqual({ data: 1, status: "success" })
  })

  it("can revalidate after a cache mutation", async () => {
    const cache = new ResourceCache()
    const fetcher = vi.fn(async () => (fetcher.mock.calls.length === 1 ? 1 : 3))
    const resource = fetchResource("count", fetcher, { cache })
    await waitForSnapshot(resource, { data: 1, status: "success" })

    await resource.mutate?.(2, { revalidate: true })

    expect(resource.snapshot()).toEqual({ data: 3, status: "success" })
  })
})

describe("subscriptionResource", () => {
  it("shares one subscription for equivalent keys", () => {
    const cache = new ResourceCache()
    const dispose = vi.fn()
    const subscribe = vi.fn(() => dispose)

    const left = subscriptionResource(["messages", "general"], subscribe, { cache })
    const right = subscriptionResource(["messages", "general"], subscribe, { cache })

    expect(subscribe).toHaveBeenCalledTimes(1)

    left.dispose()
    expect(dispose).not.toHaveBeenCalled()

    right.dispose()
    expect(dispose).toHaveBeenCalledTimes(1)
  })

  it("updates resource state from subscription events", () => {
    const cache = new ResourceCache()
    const resource = subscriptionResource<string, string>(
      "feed",
      (_key, { next }) => {
        next(null, "ready")
        next(null, (current) => `${current}:again`)
        return () => {}
      },
      { cache }
    )

    expect(resource.snapshot()).toEqual({ data: "ready:again", status: "success" })
  })

  it("retains stale data when a subscription reports an error", () => {
    const cache = new ResourceCache()
    const error = new Error("offline")
    const resource = subscriptionResource<string, string, Error>(
      "feed",
      (_key, { next }) => {
        next(null, "ready")
        next(error)
        return () => {}
      },
      { cache }
    )

    expect(resource.snapshot()).toEqual({ data: "ready", error, status: "error" })
  })
})

async function waitForSnapshot(resource: { snapshot(): unknown }, expected: unknown): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (JSON.stringify(resource.snapshot()) === JSON.stringify(expected)) {
      return
    }
    await Promise.resolve()
  }
  expect(resource.snapshot()).toEqual(expected)
}
