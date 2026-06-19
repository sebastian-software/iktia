import { computed } from "@iktia/core"

export function UnkeyedMap() {
  const items = computed(() => ["One", "Two"])

  return (
    <ul>
      {items().map((item) => <li>{item}</li>)}
    </ul>
  )
}
