import { type ComponentOptions } from "@naos-ui/core"
import css from "./field.wc.css?inline"

export type NaosFieldProps = {
  disabled?: boolean
  invalid?: boolean
  label?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosField({
  disabled = false,
  invalid = false,
  label = "Field",
}: NaosFieldProps = {}) {
  return (
    <section
      part="root"
      data-disabled={disabled || undefined}
      data-invalid={invalid || undefined}
      data-state={invalid ? "invalid" : "valid"}
    >
      <div part="label">
        <slot name="label">{label}</slot>
      </div>
      <div part="control">
        <slot />
      </div>
      <div part="hint">
        <slot name="hint" />
      </div>
      <div part="error">
        <slot name="error" />
      </div>
    </section>
  )
}
