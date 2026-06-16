/** @jsxImportSource @iktia/core */
import {
  Show,
  computed,
  effect,
  event,
  host,
  on,
  state,
} from "@iktia/core"

type IktiaCore = typeof import("@iktia/core")

// @ts-expect-error component() is not part of the v0.1 public API
type RemovedComponentApi = IktiaCore["component"]

// @ts-expect-error prop.*() is not part of the v0.1 public API
type RemovedPropApi = IktiaCore["prop"]

// @ts-expect-error signal() is not part of the v0.1 public API
type RemovedSignalApi = IktiaCore["signal"]

// @ts-expect-error useHost() is not part of the v0.1 public API
type RemovedUseHostApi = IktiaCore["useHost"]

// @ts-expect-error <For> is not part of the v0.1 public API
type RemovedForApi = IktiaCore["For"]

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
  const count = state(0)
  const doubled = computed(() => count() * 2)
  const items = computed(() => [label, String(doubled())] as const)
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
  hostHandle.update()

  // @ts-expect-error click handlers receive MouseEvent, not KeyboardEvent
  on("click", (event: KeyboardEvent) => event.key)

  on("click", (event) => event.preventDefault(), { once: true })

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
      {items().map((item, index) => (
        <span key={item} data-index={index} part="item">
          {item}
        </span>
      ))}
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
