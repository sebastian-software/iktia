import {
  connect,
  machine as tagsInputMachine,
  type Api as ZagTagsInputApi,
  type HighlightChangeDetails,
  type InputValueChangeDetails,
  type ValidityChangeDetails,
  type ValueChangeDetails,
} from "@zag-js/tags-input"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagTagsInputService = ReturnType<typeof createZagService>

type NaosZagTagsInputServiceOptions = {
  allowDuplicates: boolean
  delimiter: string
  disabled: boolean
  host: HTMLElement
  id: string
  max: number
  name: string
  onHighlightChange(details: HighlightChangeDetails): void
  onInputValueChange(details: InputValueChangeDetails): void
  onValueChange(details: ValueChangeDetails): void
  onValueInvalid(details: ValidityChangeDetails): void
  placeholder: string
  root: ParentNode
  value: string[]
}

export function tagsInputValueArray(value: string, delimiter = ","): string[] {
  return value
    .split(delimiter)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
}

export function tagsInputFormValue(value: string[]): string {
  return value.join(",")
}

export function createNaosZagTagsInputService({
  allowDuplicates,
  delimiter,
  disabled,
  host,
  id,
  max,
  name,
  onHighlightChange,
  onInputValueChange,
  onValueChange,
  onValueInvalid,
  placeholder,
  root,
  value,
}: NaosZagTagsInputServiceOptions): NaosZagTagsInputService {
  return createZagService({
    machine: tagsInputMachine as never,
    props: {
      addOnPaste: true,
      allowDuplicates,
      blurBehavior: "clear",
      defaultValue: value,
      delimiter,
      disabled,
      id,
      max,
      name,
      onHighlightChange,
      onInputValueChange,
      onValueChange,
      onValueInvalid,
      placeholder,
      validate(details: { inputValue: string }) {
        return details.inputValue.trim().length > 0
      },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagTagsInputApi(
  service: NaosZagTagsInputService | null
): ZagTagsInputApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagTagsInputService(
  service: NaosZagTagsInputService | null
) {
  service?.stop()
}
