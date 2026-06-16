type PrimitiveChild = string | number | boolean | null | undefined

export type JsxChild = JsxElement | PrimitiveChild | readonly JsxChild[]

export type JsxElement = {
  readonly kind: "lean-wc.jsx"
}

export type AttributeValue = string | number | boolean | null | undefined

export type EventHandler<EventType extends Event = Event> = (
  event: EventType & { currentTarget: EventTarget }
) => void

export type IntrinsicElementAttributes = {
  [attribute: `aria-${string}`]: AttributeValue
  [attribute: `data-${string}`]: AttributeValue
  children?: JsxChild
  class?: string
  disabled?: boolean
  id?: string
  name?: string
  onBlur?: EventHandler<FocusEvent>
  onClick?: EventHandler<PointerEvent>
  onFocus?: EventHandler<FocusEvent>
  onInput?: EventHandler<InputEvent>
  part?: string
  role?: string
  slot?: string
  type?: string
  value?: string | number | readonly string[]
}

export namespace JSX {
  export type Element = JsxElement
  export type ElementChildrenAttribute = {
    children: Record<string, never>
  }
  export type IntrinsicElements = {
    [elementName: string]: IntrinsicElementAttributes
    slot: IntrinsicElementAttributes & {
      name?: string
    }
  }
}

export function jsx(): never {
  return jsxRuntimeError()
}

export function jsxs(): never {
  return jsxRuntimeError()
}

export function jsxDEV(): never {
  return jsxRuntimeError()
}

export function Fragment(): never {
  return jsxRuntimeError()
}

function jsxRuntimeError(): never {
  throw new Error(
    "lean-wc JSX can only be used in source files transformed by the lean-wc compiler."
  )
}
