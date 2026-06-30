import { event, on, type ComponentOptions } from "@naos-ui/core"
import { createNaosToast } from "./internal/zag/toast.js"
import css from "./toast.wc.css?inline"

export type NaosToastProps = {
  closable?: boolean
  description?: string
  duration?: number
  label?: string
  title?: string
  type?: "success" | "error" | "loading" | "info" | "warning"
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosToast({
  closable = true,
  description = "",
  duration = 5000,
  label = "Show notification",
  title = "Notification",
  type = "info",
}: NaosToastProps = {}) {
  const created = event<{ id: string }>("naos-create")

  return (
    <button
      part="trigger"
      type="button"
      data-type={type}
      onClick={on("click", () => {
        const id = createNaosToast({
          closable,
          description,
          duration,
          title,
          type,
        })
        created.emit({ id })
      })}
    >
      <slot>{label}</slot>
    </button>
  )
}
