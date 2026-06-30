import { computed, effect, event, state, type ComponentOptions } from "@naos-ui/core"
import css from "./counter.wc.css?inline"

export type CounterProps = {
  label?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function Counter({ label = "Count" }: CounterProps = {}) {
  const count = state(0)
  const displayLabel = computed(() => `${label}: ${count()}`)
  const change = event<number>("change")

  effect(() => {
    document.body.dataset.lastRendered = String(count())
  })

  return (
    <button
      part="button"
      data-count={count()}
      aria-label={displayLabel()}
      onClick={() => {
        count.set(count() + 1)
        change.emit(count())
      }}
    >
      {`${label}: ${count()}`}
    </button>
  )
}
