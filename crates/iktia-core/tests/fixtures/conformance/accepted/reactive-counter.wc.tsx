import { computed, effect, event, state } from "@iktia/core"

export function ReactiveCounter({
  label = "Count",
  step = 1,
}: ReactiveCounterProps = {}) {
  const count = state(0)
  const doubled = computed(() => count() * 2)
  const change = event<number>("change")

  effect(() => {
    document.body.dataset.reactiveCounter = String(doubled())
    return () => {
      delete document.body.dataset.reactiveCounter
    }
  })

  return (
    <button
      part="button"
      data-count={doubled()}
      onClick={() => {
        count.update((value) => value + step)
        change.emit(doubled())
      }}
    >
      {label}: {doubled()}
    </button>
  )
}
