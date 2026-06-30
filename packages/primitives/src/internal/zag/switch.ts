import {
  connect,
  machine as switchMachine,
  type Api as ZagSwitchApi,
} from "@zag-js/switch"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagSwitchService = ReturnType<typeof createZagService>

type NaosZagSwitchServiceOptions = {
  checked: boolean
  disabled: boolean
  host: HTMLElement
  id: string
  label: string
  onCheckedChange(checked: boolean): void
  root: ParentNode
  value: string
}

export function createNaosZagSwitchService({
  checked,
  disabled,
  host,
  id,
  label,
  onCheckedChange,
  root,
  value,
}: NaosZagSwitchServiceOptions): NaosZagSwitchService {
  return createZagService({
    machine: switchMachine as never,
    props: {
      defaultChecked: checked,
      disabled,
      id,
      label,
      onCheckedChange(details: { checked: boolean }) {
        onCheckedChange(details.checked)
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

export function getNaosZagSwitchApi(
  service: NaosZagSwitchService | null
): ZagSwitchApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagSwitchService(
  service: NaosZagSwitchService | null
) {
  service?.stop()
}
