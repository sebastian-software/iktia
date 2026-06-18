import { type ComponentOptions } from "@iktia/core"
import css from "./tab.wc.css?inline"

export type IktiaTabProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function IktiaTab({
  disabled = false,
  label = "",
  value = "",
}: IktiaTabProps = {}) {
  void disabled
  void value

  return (
    <span part="root">
      <slot>{label || value}</slot>
    </span>
  )
}
