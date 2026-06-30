import { event, on, state, type ComponentOptions } from "@naos-ui/core"
import css from "./field.wc.css?inline"

export type FieldProps = {
  invalid?: boolean
  label?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function Field({
  invalid = false,
  label = "Project name",
}: FieldProps = {}) {
  const currentValue = state("@naos-ui")
  const changed = event<string>("field-change")

  return (
    <label part="root" data-state={invalid ? "invalid" : "valid"}>
      <span part="label">{label}</span>
      <input
        part="control"
        value={currentValue()}
        aria-invalid={invalid}
        aria-describedby="naos-field-hint"
      />
      <button
        part="action"
        type="button"
        onClick={on("click", () => {
          currentValue.set("@naos-ui/labs")
          changed.emit("@naos-ui/labs")
        })}
      >
        Use lab scope
      </button>
      <span id="naos-field-hint" part="hint">
        <slot />
      </span>
      <span part="status">Ready: {currentValue()}</span>
    </label>
  )
}
