import { event, on, type ComponentOptions } from "@naos-ui/core"
import css from "./button.wc.css?inline"

export type NaosButtonProps = {
  disabled?: boolean
  label?: string
  variant?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosButton({
  disabled = false,
  label = "",
  variant = "default",
}: NaosButtonProps = {}) {
  const pressed = event<{ variant: string }>("naos-press")

  return (
    <button
      part="root control"
      type="button"
      data-variant={variant}
      data-disabled={disabled || undefined}
      disabled={disabled}
      onClick={on("click", () => {
        if (disabled) return
        pressed.emit({ variant })
      })}
    >
      <slot name="icon" />
      <slot>{label}</slot>
    </button>
  )
}
