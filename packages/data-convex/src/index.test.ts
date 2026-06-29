import { describe, expect, it, vi } from "vitest"
import { makeFunctionReference } from "convex/server"
import type { ConnectionState } from "convex/browser"
import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server"
import { ResourceCache } from "@iktia/data"

import type { ConvexUnsubscribe } from "./index.js"
import {
  convexAction,
  convexConnectionResource,
  convexMutation,
  convexQueryKey,
  convexResource,
} from "./index.js"

type MessagesQuery = FunctionReference<"query", "public", { channel: string }, string[]>
type CreateMessageMutation = FunctionReference<"mutation", "public", { body: string }, { id: string }>
type SummarizeAction = FunctionReference<"action", "public", { body: string }, string>

const messagesQuery = makeFunctionReference<"query", { channel: string }, string[]>("messages:list")
const createMessageMutation = makeFunctionReference<
  "mutation",
  { body: string },
  { id: string }
>("messages:create")
const summarizeAction = makeFunctionReference<"action", { body: string }, string>("messages:summarize")

describe("convexResource", () => {
  it("uses stable Convex query keys", () => {
    expect(convexQueryKey(messagesQuery, { channel: "general" })).toBe(
      convexQueryKey(messagesQuery, { channel: "general" })
    )
    expect(convexQueryKey(messagesQuery, { channel: "general" })).not.toBe(
      convexQueryKey(messagesQuery, { channel: "random" })
    )
  })

  it("subscribes to Convex query updates", () => {
    const client = new FakeConvexClient()
    const resource = convexResource(client, messagesQuery, { channel: "general" }, { cache: new ResourceCache() })

    expect(resource.snapshot()).toEqual({ status: "pending" })

    client.emit(["hello"])

    expect(resource.snapshot()).toEqual({ data: ["hello"], status: "success" })
  })

  it("uses the current Convex value immediately when available", () => {
    const client = new FakeConvexClient(["cached"])
    const resource = convexResource(client, messagesQuery, { channel: "general" }, { cache: new ResourceCache() })

    expect(resource.snapshot()).toEqual({ data: ["cached"], status: "success" })
  })

  it("stores Convex query errors in resource state", () => {
    const client = new FakeConvexClient(["cached"])
    const resource = convexResource(client, messagesQuery, { channel: "general" }, { cache: new ResourceCache() })
    const error = new Error("query failed")

    client.emitError(error)

    expect(resource.snapshot()).toEqual({ data: ["cached"], error, status: "error" })
  })

  it("unsubscribes when disposed", () => {
    const client = new FakeConvexClient()
    const resource = convexResource(client, messagesQuery, { channel: "general" }, { cache: new ResourceCache() })

    expect(client.listenerCount()).toBe(1)

    resource.dispose()

    expect(client.listenerCount()).toBe(0)
  })

  it("does not subscribe when args are skipped", () => {
    const client = new FakeConvexClient()
    const resource = convexResource(client, messagesQuery, "skip", { cache: new ResourceCache() })

    expect(client.listenerCount()).toBe(0)
    expect(resource.snapshot()).toEqual({ status: "pending" })
  })
})

describe("convexMutation and convexAction", () => {
  it("wraps Convex mutations", async () => {
    const client = new FakeConvexClient()
    const createMessage = convexMutation(client, createMessageMutation)

    await expect(createMessage({ body: "hello" })).resolves.toEqual({ id: "m1" })
    expect(client.mutation).toHaveBeenCalledWith(createMessageMutation, { body: "hello" }, undefined)
  })

  it("wraps Convex actions", async () => {
    const client = new FakeConvexClient()
    const summarize = convexAction(client, summarizeAction)

    await expect(summarize({ body: "hello world" })).resolves.toBe("summary")
    expect(client.action).toHaveBeenCalledWith(summarizeAction, { body: "hello world" })
  })
})

describe("convexConnectionResource", () => {
  it("publishes connection state updates", () => {
    const client = new FakeConvexClient()
    const resource = convexConnectionResource(client, { cache: new ResourceCache() })

    expect(resource.snapshot()).toEqual({ data: disconnectedState, status: "success" })

    client.emitConnectionState(connectedState)

    expect(resource.snapshot()).toEqual({ data: connectedState, status: "success" })
  })
})

type Listener = {
  callback: (result: string[]) => unknown
  onError?: (error: Error) => unknown
}

class FakeConvexClient {
  readonly mutation = vi.fn(
    async <Mutation extends FunctionReference<"mutation">>(
      _mutation: Mutation,
      _args: FunctionArgs<Mutation>
    ) => ({ id: "m1" }) as Awaited<FunctionReturnType<Mutation>>
  )
  readonly action = vi.fn(
    async <Action extends FunctionReference<"action">>(
      _action: Action,
      _args: FunctionArgs<Action>
    ) => "summary" as Awaited<FunctionReturnType<Action>>
  )

  #connectionState = disconnectedState
  #connectionListeners = new Set<(connectionState: ConnectionState) => void>()
  #current: string[] | undefined
  #listeners = new Set<Listener>()

  constructor(current?: string[]) {
    this.#current = current
  }

  onUpdate(
    _query: MessagesQuery,
    _args: { channel: string },
    callback: (result: string[]) => unknown,
    onError?: (error: Error) => unknown
  ): ConvexUnsubscribe<string[]> {
    const listener: Listener = { callback, onError }
    this.#listeners.add(listener)

    const unsubscribe = (() => {
      this.#listeners.delete(listener)
    }) as ConvexUnsubscribe<string[]>
    unsubscribe.unsubscribe = unsubscribe
    unsubscribe.getCurrentValue = () => this.#current
    return unsubscribe
  }

  connectionState(): ConnectionState {
    return this.#connectionState
  }

  subscribeToConnectionState(callback: (connectionState: ConnectionState) => void): () => void {
    this.#connectionListeners.add(callback)
    return () => {
      this.#connectionListeners.delete(callback)
    }
  }

  emit(value: string[]): void {
    this.#current = value
    for (const listener of this.#listeners) {
      listener.callback(value)
    }
  }

  emitError(error: Error): void {
    for (const listener of this.#listeners) {
      listener.onError?.(error)
    }
  }

  emitConnectionState(connectionState: ConnectionState): void {
    this.#connectionState = connectionState
    for (const listener of this.#connectionListeners) {
      listener(connectionState)
    }
  }

  listenerCount(): number {
    return this.#listeners.size
  }
}

const disconnectedState: ConnectionState = {
  connectionCount: 0,
  connectionRetries: 0,
  hasEverConnected: false,
  hasInflightRequests: false,
  inflightActions: 0,
  inflightMutations: 0,
  isWebSocketConnected: false,
  timeOfOldestInflightRequest: null,
}

const connectedState: ConnectionState = {
  ...disconnectedState,
  connectionCount: 1,
  hasEverConnected: true,
  isWebSocketConnected: true,
}
