import { type ComponentOptions } from "@iktia/core"
import css from "./styled-slots.css?inline"

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function StyledSlots({ label = "Action" }: StyledSlotsProps = {}) {
  return (
    <button part="root label" aria-label={label}>
      <slot name="icon" />
      <span part="label">{label}</span>
      <slot />
    </button>
  )
}
