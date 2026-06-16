export type EventInitOptions = {
  bubbles?: boolean
  cancelable?: boolean
  composed?: boolean
}

export function createIktiaEvent<Detail>(
  name: string,
  detail: Detail,
  options: EventInitOptions = {}
): CustomEvent<Detail> {
  return new CustomEvent(name, {
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? false,
    composed: options.composed ?? true,
    detail,
  })
}
