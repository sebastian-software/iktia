import type { JSX, JsxChild } from "./jsx-runtime.js"

export type ComponentOptions = {
  styles?: readonly string[]
}

export type Accessor<T> = {
  (): T
}

export type WritableAccessor<T> = Accessor<T> & {
  set(value: T): void
  update(updater: (value: T) => T): void
}

export type StateAccessor<T> = WritableAccessor<T>

export type ComputedAccessor<T> = Accessor<T>

export type EffectCleanup = () => void

export type EffectCallback = () => void | EffectCleanup

export type ShowProps = {
  when: boolean
  fallback?: JsxChild
  children?: JsxChild
}

export type SwitchProps = {
  children?: JsxChild
}

export type MatchProps = {
  when?: boolean
  children?: JsxChild
}

export type ForProps<T> = {
  each: readonly T[] | null | undefined
  children: (item: T, index: number) => JSX.Element
}

export type IndexProps<T> = {
  each: readonly T[] | null | undefined
  children: (item: Accessor<T>, index: number) => JSX.Element
}

export type HostHandle = {
  readonly element: HTMLElement
  readonly root: ParentNode
  readonly signal: AbortSignal
  update(): void
  flushSync(): void
}

export type KnownDomEventMap = HTMLElementEventMap

export type EventOptions = {
  bubbles?: boolean
  cancelable?: boolean
  composed?: boolean
}

export type ListenerOptions = AddEventListenerOptions

export type EventEmitter<Detail> = {
  readonly eventName: string
  emit: [Detail] extends [void] ? (detail?: void) => void : (detail: Detail) => void
}

export type FormControlOptions = {
  value(): FormDataEntryValue | FormData | null
  reset?(): void
  disabled?: boolean
}

export type FormControlHandle = {
  readonly formAssociated: true
}

export function state<T>(initialValue: T): StateAccessor<T> {
  return authoringRuntimeError("state")
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

export function Switch(props: SwitchProps): JSX.Element {
  return authoringRuntimeError("Switch")
}

export function Match(props: MatchProps): JSX.Element {
  return authoringRuntimeError("Match")
}

export function For<T>(props: ForProps<T>): JSX.Element {
  return authoringRuntimeError("For")
}

export function Index<T>(props: IndexProps<T>): JSX.Element {
  return authoringRuntimeError("Index")
}

export function on<Name extends keyof KnownDomEventMap & string>(
  name: Name,
  handler: (event: KnownDomEventMap[Name]) => void,
  options?: ListenerOptions
): (event: KnownDomEventMap[Name] & { currentTarget: EventTarget }) => void
export function on<Name extends string, EventType extends Event = Event>(
  name: Name extends keyof KnownDomEventMap ? never : Name,
  handler: (event: EventType) => void,
  options?: ListenerOptions
): (event: EventType & { currentTarget: EventTarget }) => void
export function on(): never {
  return authoringRuntimeError("on")
}

export function host(): HostHandle {
  return authoringRuntimeError("host")
}

export function event<Detail = void>(
  name: string,
  options?: EventOptions
): EventEmitter<Detail> {
  return authoringRuntimeError("event")
}

export function formControl(options: FormControlOptions): FormControlHandle {
  return authoringRuntimeError("formControl")
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

export type { ElementRef, JSX } from "./jsx-runtime.js"
