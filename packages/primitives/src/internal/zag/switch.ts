import {
  connect,
  machine as switchMachine,
  type Api as ZagSwitchApi,
} from "@zag-js/switch"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type IktiaZagSwitchService = ReturnType<typeof createZagService>

type IktiaZagSwitchServiceOptions = {
  checked: boolean
  disabled: boolean
  host: HTMLElement
  id: string
  label: string
  onCheckedChange(checked: boolean): void
  root: ParentNode
  value: string
}

export function createIktiaZagSwitchService({
  checked,
  disabled,
  host,
  id,
  label,
  onCheckedChange,
  root,
  value,
}: IktiaZagSwitchServiceOptions): IktiaZagSwitchService {
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

export function getIktiaZagSwitchApi(
  service: IktiaZagSwitchService | null
): ZagSwitchApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopIktiaZagSwitchService(
  service: IktiaZagSwitchService | null
) {
  service?.stop()
}
