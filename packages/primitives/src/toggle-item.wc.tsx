import { type ComponentOptions } from "@naos-ui/core"
import css from "./toggle-item.wc.css?inline"

export type NaosToggleItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosToggleItem({
  disabled = false,
  label = "",
  value = "",
}: NaosToggleItemProps = {}) {
  void disabled
  void value

  return (
    <span part="root">
      <span part="indicator" aria-hidden="true" />
      <span part="label">
        <slot>{label || value}</slot>
      </span>
    </span>
  )
}
