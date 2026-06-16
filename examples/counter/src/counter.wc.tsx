import { computed, effect, event, signal, type ComponentOptions } from "lean-wc"

export type CounterProps = {
  label?: string
}

export const options = {
  shadow: true,
} satisfies ComponentOptions

export function Counter({ label = "Count" }: CounterProps = {}) {
  const count = signal(0)
  const displayLabel = computed(() => `${label}: ${count()}`)
  const change = event<number>("change")

  effect(() => {
    document.body.dataset.lastRendered = String(count())
  })

  return (
    <button
      part="button"
      data-count={count()}
      onClick={() => {
        count.set(count() + 1)
        change.emit(count())
      }}
    >
      {displayLabel()}
    </button>
  )
}
