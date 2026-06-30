import { type ComponentOptions } from "@naos-ui/core"
import css from "./listbox-item.wc.css?inline"

export type NaosListboxItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosListboxItem({
  disabled = false,
  label = "",
  value = "",
}: NaosListboxItemProps = {}) {
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
