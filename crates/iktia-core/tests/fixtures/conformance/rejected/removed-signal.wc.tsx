import { signal } from "@iktia/core"

export function RemovedSignal() {
  const count = signal(0)

  return <button>{count()}</button>
}
