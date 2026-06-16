/** @jsxImportSource @iktia/core */
import {
  For,
  Show,
  component,
  computed,
  effect,
  event,
  host,
  on,
  prop,
  signal,
  state,
  useHost,
} from "@iktia/core"

component("x-counter", { shadow: true }, () => {
  const label = prop.string("label", "Count")
  const enabled = prop.boolean("enabled", true)
  const count = state(0)
  const change = event<number>("change")
  const ready = event<void>("ready")

  label.set("Next")
  enabled.update((value) => !value)
  count.update((value) => value + 1)
  change.emit(count())
  ready.emit()

  // @ts-expect-error numeric events require numeric detail
  change.emit("wrong")

  // @ts-expect-error boolean props reject string values
  enabled.set("true")

  return (
    <button
      class="counter"
      data-count={count()}
      disabled={!enabled()}
      onClick={() => {
        count.set(count() + 1)
        change.emit(count())
      }}
    >
      <slot name="icon" />
      {label()}: {count()}
    </button>
  )
})

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
  const count = signal(0)
  const doubled = computed(() => count() * 2)
  const items = computed(() => [label, String(doubled())] as const)
  const change = event<number>("change")

  count.set(1)
  count.update((value) => value + 1)
  const doubledValue: number = doubled()

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

  const hostHandle = useHost()
  hostHandle.update()

  // @ts-expect-error click handlers receive MouseEvent, not KeyboardEvent
  on("click", (event: KeyboardEvent) => event.key)

  return (
    <button
      disabled={!enabled}
      onClick={on("click", (event) => {
        event.preventDefault()
        count.update((value) => value + 1)
        change.emit(count())
        onChange?.(new CustomEvent("change", { detail: count() }))
      })}
    >
      {label}: {count()}
      <Show when={count() > 0} fallback={<span>Empty</span>}>
        <span>{doubled()}</span>
      </Show>
      <For each={items()}>
        {(item, index) => (
          <span data-index={index} part="item">
            {item}
          </span>
        )}
      </For>
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
