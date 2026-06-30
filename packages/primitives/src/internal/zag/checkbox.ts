import {
  connect,
  machine as checkboxMachine,
  type Api as ZagCheckboxApi,
  type CheckedState,
} from "@zag-js/checkbox"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagCheckboxService = ReturnType<typeof createZagService>

type NaosZagCheckboxServiceOptions = {
  checked: boolean
  disabled: boolean
  host: HTMLElement
  id: string
  indeterminate: boolean
  onCheckedChange(details: { checked: boolean; indeterminate: boolean }): void
  root: ParentNode
  value: string
}

export function checkboxStateFor({
  checked,
  indeterminate,
}: {
  checked: boolean
  indeterminate: boolean
}): CheckedState {
  return indeterminate ? "indeterminate" : checked
}

export function createNaosZagCheckboxService({
  checked,
  disabled,
  host,
  id,
  indeterminate,
  onCheckedChange,
  root,
  value,
}: NaosZagCheckboxServiceOptions): NaosZagCheckboxService {
  return createZagService({
    machine: checkboxMachine as never,
    props: {
      defaultChecked: checkboxStateFor({ checked, indeterminate }),
      disabled,
      id,
      onCheckedChange(details: { checked: CheckedState }) {
        onCheckedChange({
          checked: details.checked === true,
          indeterminate: details.checked === "indeterminate",
        })
      },
      value,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagCheckboxApi(
  service: NaosZagCheckboxService | null
): ZagCheckboxApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagCheckboxService(
  service: NaosZagCheckboxService | null
) {
  service?.stop()
}
