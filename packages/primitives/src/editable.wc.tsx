import {
  computed,
  event,
  formControl,
  host,
  onConnected,
  onDisconnected,
  state,
  type ComponentOptions,
} from "@naos-ui/core"
import {
  createNaosZagEditableService,
  editableFormValue,
  getNaosZagEditableApi,
  stopNaosZagEditableService,
} from "./internal/zag/editable.js"
import type { NaosZagEditableService } from "./internal/zag/editable.js"
import css from "./editable.wc.css?inline"

export type NaosEditableProps = {
  disabled?: boolean
  label?: string
  maxLength?: number
  name?: string
  placeholder?: string
  readOnly?: boolean
  required?: boolean
  submitMode?: "enter" | "blur" | "both" | "none"
  value?: string
}

export const options = {
  styles: [css],
} satisfies ComponentOptions

export function NaosEditable({
  disabled = false,
  label = "Editable",
  maxLength = 120,
  name = "",
  placeholder = "Edit value",
  readOnly = false,
  required = false,
  submitMode = "both",
  value = "",
}: NaosEditableProps = {}) {
  const current = state(value)
  const editing = state(false)
  const editableService = state<NaosZagEditableService | null>(null)
  const editableApi = computed(() => getNaosZagEditableApi(editableService()))
  const changed = event<{ value: string }>("naos-change")
  const editChanged = event<{ edit: boolean }>("naos-edit-change")
  const submitted = event<{ value: string }>("naos-submit")
  const canceled = event<{ value: string }>("naos-cancel")
  const form = formControl({
    value: () => editableFormValue(current()),
    reset: () => {
      current.set(value)
      editing.set(false)
      editableApi()?.setValue(value)
      editableApi()?.cancel()
    },
    disabled,
  })
  void form
  void name

  onConnected(() => {
    editableService.set(createNaosZagEditableService({
      disabled,
      host: host().element,
      id: "naos-editable",
      label,
      maxLength,
      name,
      onEditChange(details) {
        editing.set(details.edit)
        editChanged.emit(details)
      },
      onValueChange(details) {
        current.set(details.value)
        changed.emit(details)
      },
      onValueCommit(details) {
        submitted.emit(details)
      },
      onValueRevert(details) {
        current.set(details.value)
        canceled.emit(details)
      },
      placeholder,
      readOnly,
      required,
      root: host().root,
      submitMode,
      value,
    }))
  })
  onDisconnected(() => {
    stopNaosZagEditableService(editableService())
    editableService.set(null)
  })

  return (
    <section
      {...(editableApi()?.getRootProps() ?? {})}
      part="root"
      data-state={editing() ? "edit" : "preview"}
      data-empty={current().trim() === "" || undefined}
      data-disabled={disabled || undefined}
      data-readonly={readOnly || undefined}
      data-value={current()}
    >
      <label {...(editableApi()?.getLabelProps() ?? {})} part="label">
        {label}
      </label>
      <div {...(editableApi()?.getAreaProps() ?? {})} part="area">
        <span {...(editableApi()?.getPreviewProps() ?? {})} part="preview">
          {editableApi()?.valueText ?? placeholder}
        </span>
        <input
          {...(editableApi()?.getInputProps() ?? {})}
          part="input"
          name={undefined}
          value={current()}
          disabled={disabled}
        />
      </div>
      <div {...(editableApi()?.getControlProps() ?? {})} part="control">
        <button {...(editableApi()?.getEditTriggerProps() ?? {})} part="edit">
          Edit
        </button>
        <button {...(editableApi()?.getSubmitTriggerProps() ?? {})} part="submit">
          Save
        </button>
        <button {...(editableApi()?.getCancelTriggerProps() ?? {})} part="cancel">
          Cancel
        </button>
      </div>
    </section>
  )
}
