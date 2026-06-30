import {
  connect,
  machine as editableMachine,
  type Api as ZagEditableApi,
  type EditChangeDetails,
  type SubmitMode,
  type ValueChangeDetails,
} from "@zag-js/editable"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagEditableService = ReturnType<typeof createZagService>

type NaosZagEditableServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  label: string
  maxLength: number
  name: string
  onEditChange(details: EditChangeDetails): void
  onValueChange(details: ValueChangeDetails): void
  onValueCommit(details: ValueChangeDetails): void
  onValueRevert(details: ValueChangeDetails): void
  placeholder: string
  readOnly: boolean
  required: boolean
  root: ParentNode
  submitMode: SubmitMode
  value: string
}

export function editableFormValue(value: string): FormDataEntryValue | null {
  return value ? value : null
}

export function createNaosZagEditableService({
  disabled,
  host,
  id,
  label,
  maxLength,
  name,
  onEditChange,
  onValueChange,
  onValueCommit,
  onValueRevert,
  placeholder,
  readOnly,
  required,
  root,
  submitMode,
  value,
}: NaosZagEditableServiceOptions): NaosZagEditableService {
  return createZagService({
    machine: editableMachine as never,
    props: {
      activationMode: "focus",
      defaultValue: value,
      disabled,
      id,
      maxLength,
      name,
      onEditChange,
      onValueChange,
      onValueCommit,
      onValueRevert,
      placeholder,
      readOnly,
      required,
      selectOnFocus: true,
      submitMode,
      translations: {
        cancel: `Cancel ${label}`,
        edit: `Edit ${label}`,
        input: label,
        submit: `Save ${label}`,
      },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagEditableApi(
  service: NaosZagEditableService | null
): ZagEditableApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagEditableService(
  service: NaosZagEditableService | null
) {
  service?.stop()
}
