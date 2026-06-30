import { computed, state } from "@naos-ui/core"

export function ComputedBlockBody() {
  const count = state(0)
  const doubled = computed(() => {
    return count() * 2
  })

  return <button>{doubled()}</button>
}
