import { computed, effect, event, signal, type ComponentOptions } from "@iktia/core"

export type CounterProps = {
  label?: string
}

export const options = {
  shadow: true,
  styles: [
    ":host { display: inline-block; font-family: system-ui, sans-serif; }",
    "button { display: inline-flex; align-items: center; border: 1px solid #2563eb; border-radius: 0.375rem; padding: 0.5rem 0.75rem; background: #eff6ff; color: #172554; font: inherit; }",
    "button:hover { background: #dbeafe; }",
  ],
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
