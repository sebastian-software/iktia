import { type ComponentOptions } from "@naos-ui/core"
import css from "./combobox-item.wc.css?inline"

export type NaosComboboxItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosComboboxItem({
  disabled = false,
  label = "",
  value = "",
}: NaosComboboxItemProps = {}) {
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
