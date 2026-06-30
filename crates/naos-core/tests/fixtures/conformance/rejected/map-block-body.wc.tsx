import { computed } from "@naos-ui/core"

export function MapBlockBody() {
  const items = computed(() => ["One", "Two"])

  return (
    <ul>
      {items().map((item) => {
        return <li key={item}>{item}</li>
      })}
    </ul>
  )
}
