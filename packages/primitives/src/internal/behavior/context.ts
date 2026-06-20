export type IktiaContext<Value> = {
  readonly description: string
  readonly key: symbol
}

type ContextCallback<Value> = (
  value: Value,
  unsubscribe?: VoidFunction
) => void

type ContextRequestDetail<Value> = {
  callback: ContextCallback<Value>
  context: IktiaContext<Value>
  subscribe?: boolean
}

type ContextRequestEvent<Value> = CustomEvent<ContextRequestDetail<Value>>

export type IktiaContextProvider<Value> = {
  destroy(): void
  setValue(value: Value): void
}

export function createIktiaContext<Value>(
  description: string
): IktiaContext<Value> {
  return {
    description,
    key: Symbol(description),
  }
}

export function provideIktiaContext<Value>({
  context,
  host,
  value,
}: {
  context: IktiaContext<Value>
  host: EventTarget
  value: Value
}): IktiaContextProvider<Value> {
  let currentValue = value
  const subscribers = new Set<ContextCallback<Value>>()

  const unsubscribe = (callback: ContextCallback<Value>) => {
    subscribers.delete(callback)
  }
  const listener = (event: Event) => {
    const request = event as ContextRequestEvent<Value>
    const detail = request.detail
    if (detail?.context !== context) return

    event.stopPropagation()
    if (detail.subscribe === true) {
      subscribers.add(detail.callback)
    }
    detail.callback(
      currentValue,
      detail.subscribe === true ? () => unsubscribe(detail.callback) : undefined
    )
  }

  host.addEventListener("context-request", listener)

  return {
    destroy() {
      host.removeEventListener("context-request", listener)
      subscribers.clear()
    },
    setValue(value) {
      currentValue = value
      for (const callback of Array.from(subscribers)) {
        callback(currentValue, () => unsubscribe(callback))
      }
    },
  }
}

export function consumeIktiaContext<Value>({
  callback,
  context,
  element,
  subscribe = false,
}: {
  callback: ContextCallback<Value>
  context: IktiaContext<Value>
  element: EventTarget
  subscribe?: boolean
}): VoidFunction {
  let unsubscribeProvider: VoidFunction | undefined
  let disposed = false
  let resolved = false

  const requestContext = () => {
    if (disposed) return
    const event = new CustomEvent<ContextRequestDetail<Value>>("context-request", {
      bubbles: true,
      composed: true,
      detail: {
        callback(value, unsubscribe) {
          if (disposed) {
            unsubscribe?.()
            return
          }
          resolved = true
          unsubscribeProvider?.()
          unsubscribeProvider = unsubscribe
          callback(value, unsubscribe)
        },
        context,
        subscribe,
      },
    })
    element.dispatchEvent(event)
  }

  requestContext()
  queueMicrotask(() => {
    if (!resolved) requestContext()
  })

  return () => {
    disposed = true
    unsubscribeProvider?.()
    unsubscribeProvider = undefined
  }
}
