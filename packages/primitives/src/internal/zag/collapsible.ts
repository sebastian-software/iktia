import {
  connect,
  machine as collapsibleMachine,
  type Api as ZagCollapsibleApi,
} from "@zag-js/collapsible"

import { normalizeZagProps } from "./props.js"
import { createZagScope } from "./scope.js"
import { createZagService } from "./service.js"

export type IktiaZagCollapsibleService = ReturnType<typeof createZagService>

type IktiaZagCollapsibleServiceOptions = {
  disabled: boolean
  host: HTMLElement
  id: string
  onOpenChange(open: boolean): void
  open: boolean
  root: ParentNode
}

export function createIktiaZagCollapsibleService({
  disabled,
  host,
  id,
  onOpenChange,
  open,
  root,
}: IktiaZagCollapsibleServiceOptions): IktiaZagCollapsibleService {
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

export function getIktiaZagCollapsibleApi(
  service: IktiaZagCollapsibleService | null
): ZagCollapsibleApi | null {
  if (service == null) return null
  return connect(service as never, normalizeZagProps as never)
}

export function stopIktiaZagCollapsibleService(
  service: IktiaZagCollapsibleService | null
) {
  service?.stop()
}
