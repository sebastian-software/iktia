import { event, on, state, type ComponentOptions } from "@iktia/core"
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
  const currentValue = state("@iktia")
  const changed = event<string>("field-change")

  return (
    <label part="root" data-state={invalid ? "invalid" : "valid"}>
      <span part="label">{label}</span>
      <input
        part="control"
        value={currentValue()}
        aria-invalid={invalid}
        aria-describedby="iktia-field-hint"
      />
      <button
        part="action"
        type="button"
        onClick={on("click", () => {
          currentValue.set("@iktia/labs")
          changed.emit("@iktia/labs")
        })}
      >
        Use lab scope
      </button>
      <span id="iktia-field-hint" part="hint">
        <slot />
      </span>
      <span part="status">Ready: {currentValue()}</span>
    </label>
  )
}
