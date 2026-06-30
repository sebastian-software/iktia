import { computed } from "@naos-ui/core"

export function UnkeyedMap() {
  const items = computed(() => ["One", "Two"])

  return (
    <ul>
      {items().map((item) => <li>{item}</li>)}
    </ul>
  )
}
