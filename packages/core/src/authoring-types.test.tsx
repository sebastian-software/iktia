/** @jsxImportSource @naos-ui/core */
import {
  Show,
  Switch,
  Match,
  For,
  Index,
  computed,
  effect,
  event,
  host,
  on,
  state,
  type ComponentOptions,
  type ElementRef,
} from "@naos-ui/core"

type NaosCore = typeof import("@naos-ui/core")

// @ts-expect-error component() is not part of the v0.1 public API
type RemovedComponentApi = NaosCore["component"]

// @ts-expect-error prop.*() is not part of the v0.1 public API
type RemovedPropApi = NaosCore["prop"]

// @ts-expect-error signal() is not part of the v0.1 public API
type RemovedSignalApi = NaosCore["signal"]

// @ts-expect-error useHost() is not part of the v0.1 public API
type RemovedUseHostApi = NaosCore["useHost"]

const componentOptions = {
  styles: [":host { display: block; }"],
} satisfies ComponentOptions

const componentOptionsWithShadow = {
  // @ts-expect-error shadow is not part of the public v0.1 ComponentOptions API
  shadow: false,
} satisfies ComponentOptions

const componentOptionsWithDefine = {
  // @ts-expect-error define is not part of the public v0.1 ComponentOptions API
  define: false,
} satisfies ComponentOptions

void componentOptions
void componentOptionsWithShadow
void componentOptionsWithDefine

type FunctionCounterProps = {
  enabled?: boolean
  label?: string
  onChange?: (event: CustomEvent<number>) => void
}

function FunctionCounter({
  enabled = true,
  label = "Count",
  onChange,
}: FunctionCounterProps = {}) {
  let buttonRef: HTMLButtonElement | null = null
  const callbackRef: ElementRef = (element) =>
    element.setAttribute("data-ref", "typed")
  void callbackRef
  const count = state(0)
  const doubled = computed(() => count() * 2)
  const items = computed(() => [label, String(doubled())] as const)
  const editableItems = computed(() => ["Alpha", "Beta"] as const)
  const change = event<number>("change")
  const ready = event<void>("ready", { bubbles: false })

  count.set(1)
  count.update((value) => value + 1)
  const doubledValue: number = doubled()
  ready.emit()

  // @ts-expect-error numeric events require numeric detail
  change.emit("wrong")

  // @ts-expect-error computed values are read-only
  doubled.set(1)

  effect(() => {
    const lifecycle = host()
    lifecycle.element.dataset.ready = "true"
    lifecycle.signal.addEventListener("abort", () => undefined)
    count()
    return () => {
      onChange?.(new CustomEvent("change", { detail: doubledValue }))
    }
  })

  // @ts-expect-error effects may only return cleanup functions
  effect(() => "wrong")

  const hostHandle = host()
  const updateSignal: Promise<AbortSignal> = hostHandle.update()
  hostHandle.queueTask(() => undefined)
  const hostId: string = hostHandle.id
  const hostProps: Readonly<Record<string, unknown>> = hostHandle.props
  void updateSignal
  void hostId
  void hostProps

  const typedHostHandle = host<FunctionCounterProps>()
  const typedLabel: string | undefined = typedHostHandle.props.label
  void typedLabel

  // @ts-expect-error click handlers receive MouseEvent, not KeyboardEvent
  on("click", (event: KeyboardEvent) => event.key)

  on("click", (event, signal) => {
    event.preventDefault()
    signal.throwIfAborted()
  }, { once: true })

  return (
    <button
      ref={buttonRef}
      disabled={!enabled}
      onClick={on("click", (event) => {
        event.preventDefault()
        void buttonRef
        count.update((value) => value + 1)
        change.emit(count())
        onChange?.(new CustomEvent("change", { detail: count() }))
      })}
    >
      {label}: {count()}
      <Show when={count() > 0} fallback={<span>Empty</span>}>
        <span ref={(element) => element.setAttribute("data-ref", "callback")}>
          {doubled()}
        </span>
      </Show>
      <Switch>
        <Match when={count() < 0}>
          <span>Negative</span>
        </Match>
        <Match when={count() === 0}>
          <span>Zero</span>
        </Match>
        <Match>
          <span>Positive</span>
        </Match>
      </Switch>
      {items().map((item, index) => (
        <span key={item} data-index={index} part="item">
          {item}
        </span>
      ))}
      <For each={items()} motion="flip">
        {(item, index) => (
          <span key={item} data-index={index} part="for-item">
            {item}
          </span>
        )}
      </For>
      <Index each={editableItems()}>
        {(item, index) => (
          <input data-index={index} value={item()} />
        )}
      </Index>
    </button>
  )
}

;<FunctionCounter
  enabled
  label="Clicks"
  onChange={(event) => {
    const detail: number = event.detail
    return detail
  }}
/>

// @ts-expect-error label rejects numeric values
;<FunctionCounter label={1} />

// @ts-expect-error For motion currently supports only FLIP
;<For each={[1]} motion="fade">
  {(item) => <span key={item}>{item}</span>}
</For>
