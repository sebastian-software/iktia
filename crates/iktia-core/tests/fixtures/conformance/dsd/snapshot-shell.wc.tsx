import { event, state, type ComponentOptions } from "@iktia/core"
import css from "./snapshot-shell.css?inline"

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function SnapshotShell({ label = "Count" }: SnapshotShellProps = {}) {
  const count = state(0)
  const change = event<number>("change")

  return (
    <section
      part="root"
      data-count={count()}
      aria-label={label}
      onClick={() => change.emit(count())}
    >
      {`${label}: ${count()}`}
    </section>
  )
}
