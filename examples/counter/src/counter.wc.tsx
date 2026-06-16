import { component, event, prop, state } from "lean-wc"

export default component("x-counter", { shadow: true }, () => {
  const label = prop.string("label", "Count")
  const count = state(0)
  const change = event<number>("change")

  return (
    <button
      part="button"
      data-count={count()}
      onClick={() => {
        count.set(count() + 1)
        change.emit(count())
      }}
    >
      {label()}: {count()}
    </button>
  )
})

