# Data Resources

`@iktia/data` is an optional package for loading remote data in Iktia and
plain Custom Element applications. It keeps data fetching outside
`@iktia/runtime`, `@iktia/primitives`, and the compiler while giving components
a normalized state shape for pending, success, and error states.

The base package supports two source types:

* `fetchResource()` for pull-based HTTP or service-client requests.
* `subscriptionResource()` for push-based sources such as WebSockets, database
  subscriptions, including provider adapters such as `@iktia/data-convex`.

The package is inspired by SWR's key, cache, revalidation, and mutate model,
but it does not depend on SWR or React.

## Adapter Modularity

`@iktia/data` must stay backend-neutral. It should not depend on Convex,
Firebase, Supabase, SWR, React, or any other data provider package. Apps that
only need `fetchResource()` should not install backend clients or pay their
bundle cost.

Provider integrations live in separate optional packages, such as
`@iktia/data-convex`, or in app code built on top of `subscriptionResource()`.
Those adapters can depend on their provider SDKs while keeping the generic
resource package small and usable for fetch-only applications.

## Resource State

Every resource exposes the same shape:

```ts
type ResourceState<Data, Error = unknown> =
  | { status: "pending"; data?: Data; stale?: boolean }
  | { status: "success"; data: Data; stale?: boolean }
  | { status: "error"; data?: Data; error: Error; stale?: boolean }
```

Use `snapshot()` to read the current state and `subscribe()` to receive change
notifications. Iktia component integration should subscribe for the element
instance lifetime and schedule host updates from the subscription callback.

## Fetch

Use `fetchResource()` for ordinary HTTP data, static JSON, asset metadata,
third-party APIs, or app service clients.

```ts
import { fetchResource } from "@iktia/data"

const profile = fetchResource(["profile", userId], async ([, id], { signal }) => {
  const response = await fetch(`/api/profile/${id}`, { signal })
  if (!response.ok) {
    throw new Error(`Profile request failed: ${response.status}`)
  }
  return response.json() as Promise<Profile>
})
```

Fetch resources:

* accept string, tuple, or object keys;
* treat `null`, `undefined`, and `false` keys as disabled;
* pass an `AbortSignal` to the fetcher;
* abort when the final resource instance is disposed;
* dedupe equivalent in-flight keys;
* keep cached data as `stale` while revalidating;
* expose `refetch()`;
* expose `mutate()` for cache updates and optimistic rollback.

## Subscriptions

Use `subscriptionResource()` when data arrives from a push source.

```ts
import { subscriptionResource } from "@iktia/data"

const messages = subscriptionResource(["messages", channel], ([, name], { next, signal }) => {
  const socket = new WebSocket(`/api/messages?channel=${name}`)

  socket.addEventListener("message", (event) => {
    next(null, JSON.parse(event.data) as Message[])
  })

  signal.addEventListener("abort", () => socket.close(), { once: true })

  return () => socket.close()
})
```

Equivalent subscription keys are ref-counted. Multiple resources with the same
key share one upstream subscription, and the upstream disposer runs after the
last consumer is disposed.

## Convex Adapter

Convex support lives in `@iktia/data-convex`, not inside `@iktia/data` itself.
It is a thin adapter over Convex's existing JavaScript browser client APIs, not
a fork. The package declares `convex` as a peer dependency so fetch-only apps do
not install or bundle Convex.

```ts
import { ConvexClient } from "convex/browser"
import { convexMutation, convexResource } from "@iktia/data-convex"
import { api } from "../convex/_generated/api"

const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL)

const tasks = convexResource(convex, api.tasks.list, { projectId })
const createTask = convexMutation(convex, api.tasks.create)
```

The adapter uses the same `ResourceState` contract as `fetchResource()` and
`subscriptionResource()`, while leaving Convex client creation and auth
configuration to the app.

## DSD and Hydration

The first slice is client-side dynamic data. Static Declarative Shadow DOM
output should render the component's pending or fallback UI unless the app
provides initial data. Full async DSD, streaming, and Suspense-like behavior are
separate compiler/runtime design work.
