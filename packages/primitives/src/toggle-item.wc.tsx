import { type ComponentOptions } from "@iktia/core"
import css from "./toggle-item.wc.css?inline"

export type IktiaToggleItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaToggleItem({
  disabled = false,
  label = "",
  value = "",
}: IktiaToggleItemProps = {}) {
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
