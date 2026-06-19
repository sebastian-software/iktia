import { effect, host, state } from "@iktia/core"

export function ReactivityProbe() {
  const primary = state(0)
  const secondary = state(0)

  effect(() => {
    const runs = Number(document.body.dataset.probeEffectRuns ?? "0") + 1
    document.body.dataset.probeEffectRuns = String(runs)
    document.body.dataset.probeEffectValue = String(primary())
  })

  return (
    <section part="root">
      <span data-probe-primary>{primary()}</span>
      <span data-probe-secondary>{secondary()}</span>
      <button
        data-probe-primary-button
        onClick={() => {
          primary.set(primary() + 1)
        }}
      >
        Primary
      </button>
      <button
        data-probe-secondary-button
        onClick={() => {
          secondary.set(secondary() + 1)
        }}
      >
        Secondary
      </button>
      <button
        data-probe-batch-button
        onClick={() => {
          primary.set(primary() + 1)
          primary.set(primary() + 1)
        }}
      >
        Batch
      </button>
      <button
        data-probe-flush-button
        onClick={() => {
          primary.set(primary() + 1)
          const primaryNode = host().root.querySelector("[data-probe-primary]")
          document.body.dataset.probeBeforeFlush =
            primaryNode?.textContent ?? ""
          host().flushSync()
          document.body.dataset.probeAfterFlush =
            primaryNode?.textContent ?? ""
        }}
      >
        Flush
      </button>
    </section>
  )
}
