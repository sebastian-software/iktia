export type EventInitOptions = {
  bubbles?: boolean
  cancelable?: boolean
  composed?: boolean
}

export function createNaosEvent<Detail>(
  name: string,
  detail: Detail,
  options: Readonly<EventInitOptions> = {}
): CustomEvent<Detail> {
  return new CustomEvent(name, {
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? false,
    composed: options.composed ?? true,
    detail,
  })
}

export function scheduleNaosUpdate(callback: () => void): void {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback)
    return
  }

  Promise.resolve().then(callback)
}
