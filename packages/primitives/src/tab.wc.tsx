import { type ComponentOptions } from "@naos-ui/core"
import css from "./tab.wc.css?inline"

export type NaosTabProps = {
  disabled?: boolean
  label?: string
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosTab({
  disabled = false,
  label = "",
  value = "",
}: NaosTabProps = {}) {
  void disabled
  void value

  return (
    <span part="root">
      <slot>{label || value}</slot>
    </span>
  )
}
