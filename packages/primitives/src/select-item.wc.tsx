import { type ComponentOptions } from "@naos-ui/core"
import css from "./select-item.wc.css?inline"

export type NaosSelectItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosSelectItem({
  disabled = false,
  label = "",
  value = "",
}: NaosSelectItemProps = {}) {
  void disabled
  void value

  return (
    <span part="root">
      <span part="label">
        <slot>{label || value}</slot>
      </span>
      <span part="indicator" aria-hidden="true">*</span>
    </span>
  )
}
