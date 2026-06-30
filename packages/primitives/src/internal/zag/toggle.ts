import {
  connect,
  machine as toggleMachine,
  type Api as ZagToggleApi,
} from "@zag-js/toggle"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagToggleService = ReturnType<typeof createZagService>

type NaosZagToggleServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  onPressedChange(pressed: boolean): void
  pressed: boolean
  root: ParentNode
}

export function createNaosZagToggleService({
  disabled,
  host,
  id,
  onPressedChange,
  pressed,
  root,
}: NaosZagToggleServiceOptions): NaosZagToggleService {
  return createZagService({
    machine: toggleMachine as never,
    props: {
      defaultPressed: pressed,
      disabled,
      id,
      onPressedChange,
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagToggleApi(
  service: NaosZagToggleService | null
): ZagToggleApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function withoutNaosZagToggleClick<T extends Record<string, unknown>>(
  props: T
): T {
  const nextProps = { ...props }
  delete nextProps.onClick
  return nextProps
}

export function stopNaosZagToggleService(
  service: NaosZagToggleService | null
) {
  service?.stop()
}
