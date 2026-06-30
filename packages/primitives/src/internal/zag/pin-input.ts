import {
  connect,
  machine as pinInputMachine,
  type Api as ZagPinInputApi,
  type ValueChangeDetails,
  type ValueInvalidDetails,
} from "@zag-js/pin-input"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagPinInputService = ReturnType<typeof createZagService>
export type NaosZagPinInputType = "alphanumeric" | "alphabetic" | "numeric"

type NaosZagPinInputServiceOptions = {
  count: number
  disabled: boolean
  host: HTMLElement
  id: string
  label: string
  mask: boolean
  onValueChange(details: ValueChangeDetails): void
  onValueComplete(details: ValueChangeDetails): void
  onValueInvalid(details: ValueInvalidDetails): void
  otp: boolean
  placeholder: string
  root: ParentNode
  type: NaosZagPinInputType
  value: string
}

export function pinInputValueArray(value: string, count: number): string[] {
  const chars = value.split("")
  return Array.from({ length: count }).map((_, index) => chars[index] ?? "")
}

export function createNaosZagPinInputService({
  count,
  disabled,
  host,
  id,
  label,
  mask,
  onValueChange,
  onValueComplete,
  onValueInvalid,
  otp,
  placeholder,
  root,
  type,
  value,
}: NaosZagPinInputServiceOptions): NaosZagPinInputService {
  return createZagService({
    machine: pinInputMachine as never,
    props: {
      count,
      defaultValue: pinInputValueArray(value, count),
      disabled,
      id,
      mask,
      onValueChange,
      onValueComplete,
      onValueInvalid,
      otp,
      placeholder,
      translations: {
        inputLabel(index: number, length: number) {
          return `${label} ${index + 1} of ${length}`
        },
      },
      type,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagPinInputApi(
  service: NaosZagPinInputService | null
): ZagPinInputApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagPinInputService(
  service: NaosZagPinInputService | null
) {
  service?.stop()
}
