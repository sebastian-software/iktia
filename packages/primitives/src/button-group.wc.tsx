import { type ComponentOptions } from "@naos-ui/core"
import css from "./button-group.wc.css?inline"

export type NaosButtonGroupProps = {
  disabled?: boolean
  label?: string
  orientation?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosButtonGroup({
  disabled = false,
  label = "Actions",
  orientation = "horizontal",
}: NaosButtonGroupProps = {}) {
  return (
    <div
      part="root"
      role="group"
      aria-label={label}
      aria-orientation={orientation}
      data-disabled={disabled || undefined}
      data-orientation={orientation}
    >
      <slot />
    </div>
  )
}
