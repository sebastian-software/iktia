import { type ComponentOptions } from "@naos-ui/core"
import css from "./segmented-item.wc.css?inline"

export type NaosSegmentedItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosSegmentedItem({
  disabled = false,
  label = "",
  value = "",
}: NaosSegmentedItemProps = {}) {
  void disabled
  void value

  return (
    <span part="root">
      <span part="label">
        <slot>{label || value}</slot>
      </span>
    </span>
  )
}
