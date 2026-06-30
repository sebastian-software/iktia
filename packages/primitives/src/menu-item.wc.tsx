import { type ComponentOptions } from "@naos-ui/core"
import css from "./menu-item.wc.css?inline"

export type NaosMenuItemProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosMenuItem({
  disabled = false,
  label = "",
  value = "",
}: NaosMenuItemProps = {}) {
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
