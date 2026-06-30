import {
  connect,
  machine as collapsibleMachine,
  type Api as ZagCollapsibleApi,
} from "@zag-js/collapsible"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type NaosZagCollapsibleService = ReturnType<typeof createZagService>

type NaosZagCollapsibleServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  onOpenChange(open: boolean): void
  open: boolean
  root: ParentNode
}

export function createNaosZagCollapsibleService({
  disabled,
  host,
  id,
  onOpenChange,
  open,
  root,
}: NaosZagCollapsibleServiceOptions): NaosZagCollapsibleService {
  return createZagService({
    machine: collapsibleMachine as never,
    props: {
      defaultOpen: open,
      disabled,
      id,
      onOpenChange(details: { open: boolean }) {
        onOpenChange(details.open)
      },
    },
    scope: createZagScope({
      host,
      id,
      root: root as Document | ShadowRoot,
    }),
  })
}

export function getNaosZagCollapsibleApi(
  service: NaosZagCollapsibleService | null
): ZagCollapsibleApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopNaosZagCollapsibleService(
  service: NaosZagCollapsibleService | null
) {
  service?.stop()
}
