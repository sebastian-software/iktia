import { effect, event, state, type ComponentOptions } from "@iktia/core"
import css from "./static-evaluation-boundary.css?inline"

export const options = {
  styles: [css, ":host { display: block; }"],
} satisfies ComponentOptions

export function StaticEvaluationBoundary({
  label = "Default",
  count = 1,
  enabled = true,
}: StaticEvaluationBoundaryProps = {}) {
  const items = state(["static", label])
  const meta = state({ label: label, count: count, enabled: enabled })
  const browserOnly = state(window.localStorage.getItem("boundary"))
  const changed = event<number>("boundary-change")

  effect(() => {
    document.body.dataset.effectBoundary = label
    void fetch("/analytics/effect-boundary")

    return () => {
      delete document.body.dataset.effectBoundary
    }
  })

  return (
    <article
      part="root"
      data-count={count}
      data-enabled={enabled}
      data-items={items()}
      data-meta={meta()}
      data-browser={browserOnly()}
      aria-label={label}
      onClick={() => {
        window.localStorage.setItem("clicked-boundary", label)
        void fetch("/analytics/click-boundary")
        changed.emit(count)
      }}
    >
      <slot name="lead" />
      <h2>{label}</h2>
      <p>{`${label}: ${count}`}</p>
      <p>{items()}</p>
      <p>{browserOnly()}</p>
    </article>
  )
}
