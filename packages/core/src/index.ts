import type { JSX, JsxChild } from "./jsx-runtime.js"

export type ComponentOptions = {
  shadow?: boolean
  styles?: readonly string[]
  define?: boolean
}

export type ComponentRender = () => JSX.Element

export type ComponentDefinition<TagName extends string = string> = {
  readonly kind: "iktia.component"
  readonly tagName: TagName
}

export type PropOptions = {
  attribute?: string | false
}

export type Accessor<T> = {
  (): T
}

export type WritableAccessor<T> = Accessor<T> & {
  set(value: T): void
  update(updater: (value: T) => T): void
}

export type PropAccessor<T> = WritableAccessor<T> & {
  readonly propName: string
}

export type StateAccessor<T> = WritableAccessor<T>

export type SignalAccessor<T> = WritableAccessor<T>

export type ComputedAccessor<T> = Accessor<T>

export type EffectCleanup = () => void

export type EffectCallback = () => void | EffectCleanup

export type ShowProps = {
  when: boolean
  fallback?: JsxChild
  children?: JsxChild
}

export type ForProps<Item> = {
  each: readonly Item[] | null | undefined
  children: (item: Item, index: number) => JSX.Element
}

export type HostHandle = {
  readonly element: HTMLElement
  readonly root: ParentNode
  readonly signal: AbortSignal
  update(): void
}

export type KnownDomEventMap = HTMLElementEventMap

export type EventOptions = {
  bubbles?: boolean
  cancelable?: boolean
  composed?: boolean
}

export type EventEmitter<Detail> = {
  readonly eventName: string
  emit: [Detail] extends [void] ? (detail?: void) => void : (detail: Detail) => void
}

export type PropFactory = {
  <T>(name: string, defaultValue: T, options?: PropOptions): PropAccessor<T>
  string(name: string, defaultValue?: string, options?: PropOptions): PropAccessor<string>
  boolean(name: string, defaultValue?: boolean, options?: PropOptions): PropAccessor<boolean>
  number(name: string, defaultValue?: number, options?: PropOptions): PropAccessor<number>
}

export function component<TagName extends string>(
  tagName: TagName,
  render: ComponentRender
): ComponentDefinition<TagName>
export function component<TagName extends string>(
  tagName: TagName,
  options: ComponentOptions,
  render: ComponentRender
): ComponentDefinition<TagName>
export function component(
  tagName: string,
  optionsOrRender?: ComponentOptions | ComponentRender,
  render?: ComponentRender
): never {
  return authoringRuntimeError("component")
}

export const prop: PropFactory = Object.assign(
  function genericProp<T>(
    name: string,
    defaultValue: T,
    options?: PropOptions
  ): PropAccessor<T> {
    return authoringRuntimeError("prop")
  },
  {
    string(
      name: string,
      defaultValue = "",
      options?: PropOptions
    ): PropAccessor<string> {
      return authoringRuntimeError("prop")
    },
    boolean(
      name: string,
      defaultValue = false,
      options?: PropOptions
    ): PropAccessor<boolean> {
      return authoringRuntimeError("prop")
    },
    number(
      name: string,
      defaultValue = 0,
      options?: PropOptions
    ): PropAccessor<number> {
      return authoringRuntimeError("prop")
    },
  }
)

export function state<T>(initialValue: T): StateAccessor<T> {
  return authoringRuntimeError("state")
}

export function signal<T>(initialValue: T): SignalAccessor<T> {
  return authoringRuntimeError("signal")
}

export function computed<T>(derive: () => T): ComputedAccessor<T> {
  return authoringRuntimeError("computed")
}

export function effect(callback: EffectCallback): void {
  authoringRuntimeError("effect")
}

export function Show(props: ShowProps): JSX.Element {
  return authoringRuntimeError("Show")
}

export function For<Item>(props: ForProps<Item>): JSX.Element {
  return authoringRuntimeError("For")
}

export function on<Name extends keyof KnownDomEventMap & string>(
  name: Name,
  handler: (event: KnownDomEventMap[Name]) => void
): (event: KnownDomEventMap[Name] & { currentTarget: EventTarget }) => void
export function on<Name extends string, EventType extends Event = Event>(
  name: Name extends keyof KnownDomEventMap ? never : Name,
  handler: (event: EventType) => void
): (event: EventType & { currentTarget: EventTarget }) => void
export function on(): never {
  return authoringRuntimeError("on")
}

export function host(): HostHandle {
  return authoringRuntimeError("host")
}

export function useHost(): HostHandle {
  return authoringRuntimeError("useHost")
}

export function event<Detail = void>(
  name: string,
  options?: EventOptions
): EventEmitter<Detail> {
  return authoringRuntimeError("event")
}

export function onConnected(callback: () => void): void {
  authoringRuntimeError("onConnected")
}

export function onDisconnected(callback: () => void): void {
  authoringRuntimeError("onDisconnected")
}

function authoringRuntimeError(apiName: string): never {
  throw new Error(
    `Iktia ${apiName}() can only be used in source files transformed by the Iktia compiler.`
  )
}

export type { JSX } from "./jsx-runtime.js"
