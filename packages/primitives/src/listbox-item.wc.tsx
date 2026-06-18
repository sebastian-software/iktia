import { type ComponentOptions } from "@iktia/core"
import css from "./listbox-item.wc.css?inline"

export type IktiaListboxItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaListboxItem({
  disabled = false,
  label = "",
  value = "",
}: IktiaListboxItemProps = {}) {
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
