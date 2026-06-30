import { state } from "@naos-ui/core"

export function ConditionalJsx() {
  const ready = state(false)

  return (
    <section>
      {ready() ? <span>Ready</span> : <span>Waiting</span>}
    </section>
  )
}
