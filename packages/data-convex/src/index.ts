import {
  ResourceCache,
  type Resource,
  type ResourceKey,
  defaultResourceCache,
  normalizeResourceKey,
  subscriptionResource,
} from "@iktia/data"
import { getFunctionName } from "convex/server"
import type { ConnectionState, MutationOptions } from "convex/browser"
import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server"

export type ConvexUnsubscribe<Data> = {
  (): void
  unsubscribe(): void
  getCurrentValue(): Data | undefined
}

export type ConvexQueryClient = {
  onUpdate<Query extends FunctionReference<"query">>(
    query: Query,
    args: FunctionArgs<Query>,
    callback: (result: FunctionReturnType<Query>) => unknown,
    onError?: (error: Error) => unknown
  ): ConvexUnsubscribe<FunctionReturnType<Query>>
}

export type ConvexMutationClient = {
  mutation<Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    args: FunctionArgs<Mutation>,
    options?: MutationOptions
  ): Promise<Awaited<FunctionReturnType<Mutation>>>
}

export type ConvexActionClient = {
  action<Action extends FunctionReference<"action">>(
    action: Action,
    args: FunctionArgs<Action>
  ): Promise<Awaited<FunctionReturnType<Action>>>
}

export type ConvexConnectionClient = {
  connectionState(): ConnectionState
  subscribeToConnectionState(callback: (connectionState: ConnectionState) => void): () => void
}

export type ConvexResourceOptions<Data> = {
  cache?: ResourceCache
  initialData?: Data
  key?: ResourceKey
}

export type ConvexConnectionResourceOptions = {
  cache?: ResourceCache
  initialData?: ConnectionState
  key?: ResourceKey
}

export function convexResource<Query extends FunctionReference<"query">>(
  client: ConvexQueryClient,
  query: Query,
  args: FunctionArgs<Query> | "skip",
  options: ConvexResourceOptions<FunctionReturnType<Query>> = {}
): Resource<FunctionReturnType<Query>, Error> {
  if (args === "skip") {
    return subscriptionResource(null, () => () => {}, { cache: options.cache })
  }

  const resourceKey = options.key ?? convexQueryKey(query, args)
  return subscriptionResource<FunctionReturnType<Query>, ResourceKey, Error>(
    resourceKey,
    (_key, { next }) => {
      const unsubscribe = client.onUpdate(
        query,
        args,
        (result) => next(null, result),
        (error) => next(error)
      )

      const current = unsubscribe.getCurrentValue()
      if (current !== undefined) {
        next(null, current)
      }

      return () => unsubscribeConvex(unsubscribe)
    },
    {
      cache: options.cache,
      initialData: options.initialData,
    }
  )
}

export function convexQueryKey<Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>
): string {
  const normalized = normalizeResourceKey(["convex", getFunctionName(query), args])
  if (normalized.disabled) {
    throw new Error("Convex query keys cannot be disabled.")
  }
  return normalized.key
}

export function convexMutation<Mutation extends FunctionReference<"mutation">>(
  client: ConvexMutationClient,
  mutation: Mutation,
  options?: MutationOptions
): (...args: OptionalRestArgs<Mutation>) => Promise<Awaited<FunctionReturnType<Mutation>>> {
  return (...args) => client.mutation(mutation, (args[0] ?? {}) as FunctionArgs<Mutation>, options)
}

export function convexAction<Action extends FunctionReference<"action">>(
  client: ConvexActionClient,
  action: Action
): (...args: OptionalRestArgs<Action>) => Promise<Awaited<FunctionReturnType<Action>>> {
  return (...args) => client.action(action, (args[0] ?? {}) as FunctionArgs<Action>)
}

export function convexConnectionResource(
  client: ConvexConnectionClient,
  options: ConvexConnectionResourceOptions = {}
): Resource<ConnectionState, Error> {
  const cache = options.cache ?? defaultResourceCache
  return subscriptionResource<ConnectionState, ResourceKey, Error>(
    options.key ?? "convex:connection",
    (_key, { next }) => {
      try {
        next(null, client.connectionState())
      } catch (error) {
        next(normalizeError(error))
      }

      return client.subscribeToConnectionState((connectionState) => next(null, connectionState))
    },
    {
      cache,
      initialData: options.initialData,
    }
  )
}

function unsubscribeConvex(unsubscribe: ConvexUnsubscribe<unknown>): void {
  unsubscribe.unsubscribe()
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
