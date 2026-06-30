import { effect, host, on, state } from "@naos-ui/core"

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
      <button
        data-probe-event-signal-button
        onClick={on("click", async (_event, signal) => {
          const run = Number(document.body.dataset.probeEventRun ?? "0") + 1
          document.body.dataset.probeEventRun = String(run)
          document.body.dataset.probeEventSignalAborted = String(signal.aborted)
          signal.addEventListener(
            "abort",
            () => {
              const aborts =
                Number(document.body.dataset.probeEventAbortCount ?? "0") + 1
              document.body.dataset.probeEventAbortCount = String(aborts)
            },
            { once: true }
          )
          await new Promise((resolve) => setTimeout(resolve, 50))
          document.body.dataset.probeEventSignalAborted = String(signal.aborted)
          if (!signal.aborted) {
            document.body.dataset.probeEventCompletedRun = String(run)
          }
        })}
      >
        Event signal
      </button>
      <button
        data-probe-update-signal-button
        onClick={on("click", async () => {
          primary.set(primary() + 1)
          const updateSignal = await host().update()
          document.body.dataset.probeUpdateSignalAborted = String(
            updateSignal.aborted
          )
          updateSignal.addEventListener(
            "abort",
            () => {
              const aborts =
                Number(document.body.dataset.probeUpdateAbortCount ?? "0") + 1
              document.body.dataset.probeUpdateAbortCount = String(aborts)
            },
            { once: true }
          )
          host().queueTask(() => {
            const primaryNode = host().root.querySelector("[data-probe-primary]")
            document.body.dataset.probeQueuedTaskPrimary =
              primaryNode?.textContent ?? ""
          })
        })}
      >
        Update signal
      </button>
    </section>
  )
}
