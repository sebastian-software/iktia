import { type ComponentOptions } from "@iktia/core"
import css from "./combobox-item.wc.css?inline"

export type IktiaComboboxItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaComboboxItem({
  disabled = false,
  label = "",
  value = "",
}: IktiaComboboxItemProps = {}) {
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
